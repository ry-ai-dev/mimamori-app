import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildMorningCheckMessage, pushMessage } from '@/lib/line/push-message';

type Watchee = {
  id: string;
  line_user_id: string | null;
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

  const { data: watchees, error } = await supabase
    .from('watchees')
    .select('id, line_user_id')
    .not('line_user_id', 'is', null);

  if (error) {
    console.error('対象者の取得に失敗しました:', error.message);
    return NextResponse.json({ error: '対象者の取得に失敗しました' }, { status: 500 });
  }

  const results = await Promise.allSettled(
    (watchees ?? []).map((watchee) => sendMorningNotification(supabase, watchee)),
  );

  const failures = results.flatMap((result) => (result.status === 'rejected' ? [String(result.reason)] : []));
  const sent = results.length - failures.length;

  failures.forEach((reason) => console.error('朝の安否確認通知の送信に失敗しました:', reason));

  return NextResponse.json({ total: results.length, sent, failed: failures.length });
}

async function sendMorningNotification(supabase: ReturnType<typeof createAdminClient>, watchee: Watchee) {
  if (!watchee.line_user_id) return;

  const { data: notification, error: insertError } = await supabase
    .from('notifications')
    .insert({ watchee_id: watchee.id })
    .select('id')
    .single();

  if (insertError || !notification) {
    throw new Error(`通知レコードの作成に失敗しました (watchee: ${watchee.id}): ${insertError?.message}`);
  }

  const { messageId } = await pushMessage(watchee.line_user_id, buildMorningCheckMessage(notification.id));

  if (messageId) {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ line_message_id: messageId })
      .eq('id', notification.id);

    if (updateError) {
      console.error(`line_message_idの更新に失敗しました (notification: ${notification.id}):`, updateError.message);
    }
  }
}
