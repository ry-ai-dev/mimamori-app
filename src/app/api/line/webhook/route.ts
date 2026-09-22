import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyLineSignature } from '@/lib/line/verify-signature';
import { replyMessage } from '@/lib/line/reply-message';

const DUPLICATE_WINDOW_MS = 10_000;
const CONFIRMATION_MESSAGE = 'ありがとうございます、確認しました。';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LinePostbackEvent = {
  type: 'postback';
  postback: { data: string };
  source: { type: string; userId?: string };
  timestamp: number;
  replyToken: string;
};

type LineWebhookEvent = LinePostbackEvent | { type: string };

type LineWebhookBody = {
  destination: string;
  events: LineWebhookEvent[];
};

function isPostbackEvent(event: LineWebhookEvent): event is LinePostbackEvent {
  return event.type === 'postback';
}

export async function POST(request: Request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error('LINE_CHANNEL_SECRETが設定されていません');
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 });
  }

  // 署名検証は生のボディ文字列に対して行う必要があるため、JSON.parse前にrequest.text()で取得する
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature');

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ error: '署名が不正です' }, { status: 401 });
  }

  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  // LINE Developersコンソールの「検証」ボタンはevents: []で疎通確認するだけなので、そのまま200を返す
  const postbackEvents = (body.events ?? []).filter(isPostbackEvent);
  if (postbackEvents.length === 0) {
    return NextResponse.json({ status: 'ok' });
  }

  const supabase = createAdminClient();

  await Promise.allSettled(postbackEvents.map((event) => recordResponse(supabase, event)));

  // LINEは非2xx応答をリトライするため、個々の記録失敗に関わらず200を返す（失敗はログで追う）
  return NextResponse.json({ status: 'ok' });
}

async function recordResponse(
  supabase: ReturnType<typeof createAdminClient>,
  event: LinePostbackEvent,
) {
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  const { data: watchee, error: watcheeError } = await supabase
    .from('watchees')
    .select('id')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (watcheeError) {
    console.error('対象者の検索に失敗しました:', watcheeError.message);
    return;
  }

  if (!watchee) {
    console.warn(`未連携のLINEユーザーからのpostbackを受信しました: ${lineUserId}`);
    return;
  }

  const { data: recent, error: recentError } = await supabase
    .from('responses')
    .select('responded_at')
    .eq('watchee_id', watchee.id)
    .order('responded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentError) {
    console.error('直近の応答確認に失敗しました:', recentError.message);
    return;
  }

  const isDuplicate =
    !!recent && Date.now() - new Date(recent.responded_at).getTime() < DUPLICATE_WINDOW_MS;

  if (!isDuplicate) {
    // postback.dataは "notification_id=xxx&status=ok" 形式（F-01が送信時に埋め込む）
    const params = new URLSearchParams(event.postback.data);
    const status = params.get('status') ?? event.postback.data ?? 'ok';
    const notificationId = params.get('notification_id');
    const isValidNotificationId = !!notificationId && UUID_PATTERN.test(notificationId);

    const { error: insertError } = await supabase.from('responses').insert({
      watchee_id: watchee.id,
      notification_id: isValidNotificationId ? notificationId : null,
      status,
    });

    if (insertError) {
      console.error('応答の記録に失敗しました:', insertError.message);
      return;
    }
  }

  // 連打の2件目以降も返信はする。無反応だと本人が不安になりさらに連打しかねないため
  await replyMessage(event.replyToken, CONFIRMATION_MESSAGE);
}
