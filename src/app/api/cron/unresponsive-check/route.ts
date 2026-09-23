import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UNRESPONSIVE_THRESHOLD_HOURS = 3;

type StaleNotification = {
  id: string;
  watchee_id: string;
  sent_at: string;
};

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRETが設定されていません');
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const cutoff = new Date(Date.now() - UNRESPONSIVE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('id, watchee_id, sent_at')
    .lte('sent_at', cutoff)
    .not('line_message_id', 'is', null);

  if (notificationsError) {
    console.error('未応答チェック対象の通知取得に失敗しました:', notificationsError.message);
    return NextResponse.json({ error: '未応答チェック対象の通知取得に失敗しました' }, { status: 500 });
  }

  if (!notifications || notifications.length === 0) {
    return NextResponse.json({ checked: 0, alerted: 0, skipped: 0, failed: 0 });
  }

  const ids = notifications.map((n) => n.id);

  const { data: responses, error: responsesError } = await supabase
    .from('responses')
    .select('notification_id')
    .in('notification_id', ids);

  if (responsesError) {
    console.error('応答の取得に失敗しました:', responsesError.message);
    return NextResponse.json({ error: '応答の取得に失敗しました' }, { status: 500 });
  }

  // responses.notification_id はpostbackデータに有効なUUIDが含まれない場合にnullになりうるが、
  // その場合はidsのいずれとも一致しないため、このfilterは型を絞るための処理であり結果に影響しない
  const respondedIds = new Set(
    (responses ?? []).map((r) => r.notification_id).filter((id): id is string => id !== null),
  );

  const { data: existingAlerts, error: alertsError } = await supabase
    .from('alerts')
    .select('notification_id')
    .in('notification_id', ids);

  if (alertsError) {
    console.error('既存アラートの取得に失敗しました:', alertsError.message);
    return NextResponse.json({ error: '既存アラートの取得に失敗しました' }, { status: 500 });
  }

  const alreadyAlertedIds = new Set((existingAlerts ?? []).map((a) => a.notification_id));

  const unresponsive = notifications.filter(
    (n) => !respondedIds.has(n.id) && !alreadyAlertedIds.has(n.id),
  );

  const results = await Promise.allSettled(
    unresponsive.map((notification) => createAlert(supabase, notification)),
  );

  const failures = results.flatMap((result) => (result.status === 'rejected' ? [String(result.reason)] : []));

  failures.forEach((reason) => console.error('未応答アラートの作成に失敗しました:', reason));

  return NextResponse.json({
    checked: notifications.length,
    alerted: unresponsive.length - failures.length,
    skipped: notifications.length - unresponsive.length,
    failed: failures.length,
  });
}

async function createAlert(supabase: ReturnType<typeof createAdminClient>, notification: StaleNotification) {
  const { error } = await supabase
    .from('alerts')
    .insert({ watchee_id: notification.watchee_id, notification_id: notification.id });

  if (error) {
    if (error.code === '23505') {
      // 同時実行のcronジョブとの競合による重複。想定内のため失敗扱いにしない
      return;
    }
    throw new Error(`アラートの作成に失敗しました (notification: ${notification.id}): ${error.message}`);
  }
}
