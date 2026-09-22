'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createWatchee, type CreateWatcheeState } from './actions';

const initialState: CreateWatcheeState = {};

export function NewWatcheeForm() {
  const [state, formAction, isPending] = useActionState(createWatchee, initialState);

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10">
      <Link href="/watchees" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        ← 一覧に戻る
      </Link>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">見守り対象者を登録</h1>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              名前
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="例: 田中 花子"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {isPending ? '登録中…' : '登録する'}
          </button>
        </form>
      </div>
    </div>
  );
}
