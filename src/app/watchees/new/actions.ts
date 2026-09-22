'use server';

import { createClient } from '@/lib/supabase/server';
import { generateLinkCode, linkCodeExpiresAt } from '@/lib/watchees/link-code';
import { redirect } from 'next/navigation';

export type CreateWatcheeState = { error?: string };

export async function createWatchee(
  _prevState: CreateWatcheeState,
  formData: FormData,
): Promise<CreateWatcheeState> {
  const name = formData.get('name');

  if (typeof name !== 'string' || !name.trim()) {
    return { error: '名前を入力してください' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('watchees')
    .insert({
      owner_id: user.id,
      name: name.trim(),
      link_code: generateLinkCode(),
      link_code_expires_at: linkCodeExpiresAt(),
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: '登録に失敗しました。時間をおいて再度お試しください' };
  }

  redirect(`/watchees/${data.id}`);
}
