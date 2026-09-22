'use client';

import { useActionState } from 'react';
import { regenerateLinkCode, type RegenerateLinkCodeState } from './actions';

const initialState: RegenerateLinkCodeState = {};

export function RegenerateCodeButton({ watcheeId }: { watcheeId: string }) {
  const action = regenerateLinkCode.bind(null, watcheeId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-3">
      {state.error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
      >
        {isPending ? '発行中…' : 'コードを再発行'}
      </button>
    </form>
  );
}
