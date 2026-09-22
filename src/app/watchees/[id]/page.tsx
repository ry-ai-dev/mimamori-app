import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RegenerateCodeButton } from './regenerate-code-button';

export default async function WatcheeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: watchee } = await supabase
    .from('watchees')
    .select('id, name, line_user_id, link_code, link_code_expires_at, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!watchee) {
    notFound();
  }

  const isLinked = Boolean(watchee.line_user_id);
  const isCodeValid =
    Boolean(watchee.link_code) &&
    Boolean(watchee.link_code_expires_at) &&
    new Date(watchee.link_code_expires_at!) > new Date();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/watchees" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        ← 一覧に戻る
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{watchee.name}</h1>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {isLinked ? (
          <p className="text-sm font-medium text-green-700 dark:text-green-400">LINE連携済みです</p>
        ) : (
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">LINE未連携</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              下のコードを本人に伝え、LINEで見守り安否確認の公式アカウントを友だち追加のうえ入力してもらってください。
            </p>

            {isCodeValid ? (
              <div className="mt-4 rounded-md bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
                <p className="text-2xl font-mono font-semibold tracking-widest text-zinc-900 dark:text-zinc-50">
                  {watchee.link_code}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  有効期限: {new Date(watchee.link_code_expires_at!).toLocaleString('ja-JP')}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                コードの有効期限が切れています。再発行してください。
              </p>
            )}

            <RegenerateCodeButton watcheeId={watchee.id} />
          </div>
        )}
      </div>
    </div>
  );
}
