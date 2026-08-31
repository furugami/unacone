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
	channelIcon?: string;
	// 配信中かどうか（2026/08/31追加）。trueの場合startTimeは実際の配信開始時刻を表す。
	// cronの更新間隔（30分程度）ぶんのラグは許容する前提。
	isLive?: boolean;
};

// 配信タイトルのキーワードから「参加型」「ソロラン」を判定してタグ付けする。
// 精度100%は狙わず、キーワードに合致しない場合はタグなしとする（2026/08/30追加）。
const STREAM_TAG_KEYWORDS: Record<string, string[]> = {
	参加型: ['参加型', '視聴者参加型'],
	ソロラン: ['ソロラン', 'ソロランクマ'],
	カスタム: ['カスタム'],
	コラボ: ['コラボ'],
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

// Twitchで現在配信中かどうかを取得する（2026/08/31追加）。Get Streamsは1日あたりの
// ユニット制限が無く、レート制限も緩いためコストはほぼ気にしなくてよい。
export async function fetchTwitchLive(login: string): Promise<ScheduleEntry | null> {
	const clientId = import.meta.env.TWITCH_CLIENT_ID;
	const clientSecret = import.meta.env.TWITCH_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;

	const token = await getTwitchAppToken(clientId, clientSecret);
	if (!token) return null;

	try {
		const headers = { 'Client-Id': clientId, Authorization: `Bearer ${token}` };
		const res = await fetch(
			`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}&type=live`,
			{ headers }
		);
		if (!res.ok) return null;
		const data = await res.json();
		const stream = data.data?.[0];
		if (!stream) return null;

		return {
			platform: 'twitch',
			title: stream.title,
			startTime: new Date(stream.started_at),
			url: `https://twitch.tv/${login}`,
			isLive: true,
		};
	} catch {
		return null;
	}
}

// YouTubeの予約配信・配信中を、特定チャンネルについて取得する共通処理。
// search.listで動画IDを探し、videos.listで正確な時刻（liveStreamingDetails）を取得する2段階構成。
async function fetchYoutubeByChannel(
	channelId: string,
	eventType: 'upcoming' | 'live'
): Promise<ScheduleEntry[]> {
	const apiKey = import.meta.env.YOUTUBE_API_KEY;
	if (!apiKey) return [];

	try {
		const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&type=video&eventType=${eventType}&order=date&part=id`;
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

		// 予約配信は予定時刻(scheduledStartTime)、配信中は実際の開始時刻(actualStartTime)を見る。
		const timeField = eventType === 'live' ? 'actualStartTime' : 'scheduledStartTime';

		return (videosData.items ?? [])
			.filter(
				(item: { liveStreamingDetails?: Record<string, string | undefined> }) =>
					item.liveStreamingDetails?.[timeField]
			)
			.map(
				(item: {
					id: string;
					snippet: { title: string };
					liveStreamingDetails: Record<string, string>;
				}) => ({
					platform: 'youtube' as const,
					title: item.snippet.title,
					startTime: new Date(item.liveStreamingDetails[timeField]),
					url: `https://www.youtube.com/watch?v=${item.id}`,
					isLive: eventType === 'live',
				})
			);
	} catch {
		return [];
	}
}

export function fetchYoutubeUpcoming(channelId: string): Promise<ScheduleEntry[]> {
	return fetchYoutubeByChannel(channelId, 'upcoming');
}

// YouTubeで現在配信中かどうかを取得する（2026/08/31追加）。登録配信者1人あたり
// search.list 100 + videos.list 1 ユニット消費（予約配信取得と同じコスト）。
export function fetchYoutubeLive(channelId: string): Promise<ScheduleEntry[]> {
	return fetchYoutubeByChannel(channelId, 'live');
}

// キーワードで、登録配信者に限らず広くYouTubeの予約配信・配信中を検索する共通処理。
// 精度は完全ではない（無関係な動画が混ざる可能性がある）前提で、補助的な一覧として使う。
async function fetchYoutubeByKeyword(
	keyword: string,
	eventType: 'upcoming' | 'live',
	maxResults: number
): Promise<ScheduleEntry[]> {
	const apiKey = import.meta.env.YOUTUBE_API_KEY;
	if (!apiKey) return [];

	try {
		const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(keyword)}&type=video&eventType=${eventType}&order=date&part=id&maxResults=${maxResults}`;
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

		const timeField = eventType === 'live' ? 'actualStartTime' : 'scheduledStartTime';
		const items = (videosData.items ?? []).filter(
			(item: { liveStreamingDetails?: Record<string, string | undefined> }) =>
				item.liveStreamingDetails?.[timeField]
		);

		// チャンネルアイコンをまとめて取得（重複除去して1回のAPI呼び出しに集約）。
		const uniqueChannelIds = [
			...new Set(items.map((item: { snippet: { channelId: string } }) => item.snippet.channelId)),
		];
		const channelIcons = new Map<string, string>();
		if (uniqueChannelIds.length > 0) {
			const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&id=${uniqueChannelIds.join(',')}&part=snippet`;
			const channelsRes = await fetch(channelsUrl);
			if (channelsRes.ok) {
				const channelsData = await channelsRes.json();
				for (const channel of channelsData.items ?? []) {
					const iconUrl = channel.snippet?.thumbnails?.default?.url;
					if (iconUrl) channelIcons.set(channel.id, iconUrl);
				}
			}
		}

		return items.map(
			(item: {
				id: string;
				snippet: { title: string; channelId: string; channelTitle: string };
				liveStreamingDetails: Record<string, string>;
			}) => ({
				platform: 'youtube' as const,
				title: item.snippet.title,
				channelName: item.snippet.channelTitle,
				channelId: item.snippet.channelId,
				channelIcon: channelIcons.get(item.snippet.channelId),
				startTime: new Date(item.liveStreamingDetails[timeField]),
				url: `https://www.youtube.com/watch?v=${item.id}`,
				isLive: eventType === 'live',
			})
		);
	} catch {
		return [];
	}
}

export function fetchYoutubeUpcomingByKeyword(keyword: string, maxResults = 10): Promise<ScheduleEntry[]> {
	return fetchYoutubeByKeyword(keyword, 'upcoming', maxResults);
}

// キーワードで現在配信中のものを広く検索する（2026/08/31追加）。
// search.list 100 + videos.list 1 + channels.list 1 ≒ 102ユニット、既存のfetchYoutubeUpcomingByKeyword
// と同じコストが上乗せされる。
export function fetchYoutubeLiveByKeyword(keyword: string, maxResults = 10): Promise<ScheduleEntry[]> {
	return fetchYoutubeByKeyword(keyword, 'live', maxResults);
}
