import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const STATUS_LABELS: Record<string, string> = {
  ok: '元気です',
};
const FALLBACK_STATUS_LABEL = '応答あり';

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: watchees } = await supabase
    .from('watchees')
    .select('id, name, line_user_id, created_at')
    .order('created_at', { ascending: false });

  const latestByWatchee = new Map<string, { responded_at: string; status: string }>();

  if (watchees && watchees.length > 0) {
    const watcheeIds = watchees.map((w) => w.id);
    const { data: responses } = await supabase
      .from('responses')
      .select('watchee_id, responded_at, status')
      .in('watchee_id', watcheeIds)
      .order('responded_at', { ascending: false });

    for (const r of responses ?? []) {
      if (!latestByWatchee.has(r.watchee_id)) {
        latestByWatchee.set(r.watchee_id, r);
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">ダッシュボード</h1>
        <Link
          href="/watchees"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          対象者を管理する →
        </Link>
      </div>

      {!watchees || watchees.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          まだ見守り対象者が登録されていません。「対象者を管理する」から追加してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {watchees.map((watchee) => {
            const latest = latestByWatchee.get(watchee.id);
            const now = new Date();

            return (
              <li key={watchee.id}>
                <Link
                  href={`/watchees/${watchee.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{watchee.name}</span>

                  <span
                    className={
                      watchee.line_user_id
                        ? 'text-sm text-green-700 dark:text-green-400'
                        : 'text-sm text-zinc-500 dark:text-zinc-500'
                    }
                  >
                    {watchee.line_user_id ? 'LINE連携済み' : 'LINE未連携'}
                  </span>

                  {!latest ? (
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">まだ応答がありません</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          isSameLocalDay(new Date(latest.responded_at), now)
                            ? 'text-sm text-green-700 dark:text-green-400'
                            : 'text-sm text-amber-700 dark:text-amber-400'
                        }
                      >
                        {STATUS_LABELS[latest.status] ?? FALLBACK_STATUS_LABEL}
                      </span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(latest.responded_at).toLocaleString('ja-JP')}
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
