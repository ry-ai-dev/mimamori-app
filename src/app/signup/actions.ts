'use server';

import { toJapaneseAuthErrorMessage } from '@/lib/supabase/auth-error-messages';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type SignupState = { error?: string; success?: boolean };

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください' };
  }
  if (password.length < 8) {
    return { error: 'パスワードは8文字以上で入力してください' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: toJapaneseAuthErrorMessage(error) };
  }

  // Supabaseはメール列挙対策のため、登録済みメールアドレスでもエラーを返さず
  // identitiesが空配列のuserを返す。この場合を既登録として扱う
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: 'このメールアドレスは既に登録されています' };
  }

  if (data.session) {
    redirect('/');
  }

  return { success: true };
}
