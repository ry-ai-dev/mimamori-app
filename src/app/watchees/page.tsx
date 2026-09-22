import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function WatcheesPage() {
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">見守り対象者一覧</h1>
        <Link
          href="/watchees/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + 新しく登録
        </Link>
      </div>

      {!watchees || watchees.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          まだ見守り対象者が登録されていません。「+ 新しく登録」から追加してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {watchees.map((watchee) => (
            <li key={watchee.id}>
              <Link
                href={`/watchees/${watchee.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
