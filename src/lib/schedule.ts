// 配信スケジュール取得（ビルド時にTwitch/YouTube公式APIから取得。CMS管理はしない）
// 参照: CLAUDE.md「配信者スケジュールカレンダー 設計」、CLAUDE-3.md「配信者カレンダー実装方針の軽量化」
//
// APIキー未設定の場合は空配列を返し、ページ側で「予定は配信者のSNS等でご確認ください」に
// フォールバックする（ビルドを失敗させない）。
// 必要な環境変数: TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET / YOUTUBE_API_KEY
// （.env.example参照。ローカルは.envファイル、本番はGitHub Actions Secretsで設定する）

export type ScheduleEntry = {
	platform: 'twitch' | 'youtube';
	title: string;
	startTime: Date;
	url: string;
	// キーワード検索でヒットした場合のみ設定（登録配信者ブロックでは配信者名を別で表示するため不要）。
	channelName?: string;
	channelId?: string;
};

// 配信タイトルのキーワードから「参加型」「ソロラン」を判定してタグ付けする。
// 精度100%は狙わず、キーワードに合致しない場合はタグなしとする（2026/08/30追加）。
const STREAM_TAG_KEYWORDS: Record<string, string[]> = {
	参加型: ['参加型', '視聴者参加型'],
	ソロラン: ['ソロラン', 'ソロランクマ'],
};

export function detectStreamTags(title: string): string[] {
	return Object.entries(STREAM_TAG_KEYWORDS)
		.filter(([, keywords]) => keywords.some((keyword) => title.includes(keyword)))
		.map(([tag]) => tag);
}

async function getTwitchAppToken(clientId: string, clientSecret: string): Promise<string | null> {
	try {
		const res = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'client_credentials',
			}),
		});
		if (!res.ok) return null;
		const data = await res.json();
		return data.access_token ?? null;
	} catch {
		return null;
	}
}

// Twitchの配信スケジュール機能（配信者がTwitch上で設定した予定）を取得する
export async function fetchTwitchSchedule(login: string): Promise<ScheduleEntry[]> {
	const clientId = import.meta.env.TWITCH_CLIENT_ID;
	const clientSecret = import.meta.env.TWITCH_CLIENT_SECRET;
	if (!clientId || !clientSecret) return [];

	const token = await getTwitchAppToken(clientId, clientSecret);
	if (!token) return [];

	try {
		const headers = { 'Client-Id': clientId, Authorization: `Bearer ${token}` };

		const userRes = await fetch(
			`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
			{ headers }
		);
		if (!userRes.ok) return [];
		const userData = await userRes.json();
		const broadcasterId = userData.data?.[0]?.id;
		if (!broadcasterId) return [];

		const scheduleRes = await fetch(
			`https://api.twitch.tv/helix/schedule?broadcaster_id=${broadcasterId}`,
			{ headers }
		);
		if (!scheduleRes.ok) return [];
		const scheduleData = await scheduleRes.json();
		const segments = scheduleData.data?.segments ?? [];

		return segments.map((segment: { title: string; start_time: string }) => ({
			platform: 'twitch' as const,
			title: segment.title,
			startTime: new Date(segment.start_time),
			url: `https://twitch.tv/${login}`,
		}));
	} catch {
		return [];
	}
}

// YouTubeの予約配信（upcoming live）を取得する。search.listで動画IDを探し、
// videos.listで正確な予定開始時刻（liveStreamingDetails.scheduledStartTime）を取得する2段階構成。
export async function fetchYoutubeUpcoming(channelId: string): Promise<ScheduleEntry[]> {
	const apiKey = import.meta.env.YOUTUBE_API_KEY;
	if (!apiKey) return [];

	try {
		const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&type=video&eventType=upcoming&order=date&part=id`;
		const searchRes = await fetch(searchUrl);
		if (!searchRes.ok) return [];
		const searchData = await searchRes.json();
		const videoIds = (searchData.items ?? [])
			.map((item: { id: { videoId?: string } }) => item.id.videoId)
			.filter((id: string | undefined): id is string => Boolean(id));
		if (videoIds.length === 0) return [];

		const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds.join(',')}&part=snippet,liveStreamingDetails`;
		const videosRes = await fetch(videosUrl);
		if (!videosRes.ok) return [];
		const videosData = await videosRes.json();

		return (videosData.items ?? [])
			.filter(
				(item: { liveStreamingDetails?: { scheduledStartTime?: string } }) =>
					item.liveStreamingDetails?.scheduledStartTime
			)
			.map(
				(item: {
					id: string;
					snippet: { title: string };
					liveStreamingDetails: { scheduledStartTime: string };
				}) => ({
					platform: 'youtube' as const,
					title: item.snippet.title,
					startTime: new Date(item.liveStreamingDetails.scheduledStartTime),
					url: `https://www.youtube.com/watch?v=${item.id}`,
				})
			);
	} catch {
		return [];
	}
}

// キーワードで、登録配信者に限らず広くYouTubeの予約配信を検索する（2026/08/30追加）。
// 精度は完全ではない（無関係な動画が混ざる可能性がある）前提で、補助的な一覧として使う。
export async function fetchYoutubeUpcomingByKeyword(
	keyword: string,
	maxResults = 10
): Promise<ScheduleEntry[]> {
	const apiKey = import.meta.env.YOUTUBE_API_KEY;
	if (!apiKey) return [];

	try {
		const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(keyword)}&type=video&eventType=upcoming&order=date&part=id&maxResults=${maxResults}`;
		const searchRes = await fetch(searchUrl);
		if (!searchRes.ok) return [];
		const searchData = await searchRes.json();
		const videoIds = (searchData.items ?? [])
			.map((item: { id: { videoId?: string } }) => item.id.videoId)
			.filter((id: string | undefined): id is string => Boolean(id));
		if (videoIds.length === 0) return [];

		const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds.join(',')}&part=snippet,liveStreamingDetails`;
		const videosRes = await fetch(videosUrl);
		if (!videosRes.ok) return [];
		const videosData = await videosRes.json();

		return (videosData.items ?? [])
			.filter(
				(item: { liveStreamingDetails?: { scheduledStartTime?: string } }) =>
					item.liveStreamingDetails?.scheduledStartTime
			)
			.map(
				(item: {
					id: string;
					snippet: { title: string; channelId: string; channelTitle: string };
					liveStreamingDetails: { scheduledStartTime: string };
				}) => ({
					platform: 'youtube' as const,
					title: item.snippet.title,
					channelName: item.snippet.channelTitle,
					channelId: item.snippet.channelId,
					startTime: new Date(item.liveStreamingDetails.scheduledStartTime),
					url: `https://www.youtube.com/watch?v=${item.id}`,
				})
			);
	} catch {
		return [];
	}
}
