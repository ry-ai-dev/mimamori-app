import type { AuthError } from '@supabase/supabase-js';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'メールアドレスまたはパスワードが正しくありません',
  email_not_confirmed:
    'メールアドレスの確認が完了していません。届いたメール内のリンクをクリックしてください',
  user_already_exists: 'このメールアドレスは既に登録されています',
  weak_password: 'パスワードは8文字以上で入力してください',
  email_address_invalid: 'メールアドレスの形式が正しくありません',
  over_email_send_rate_limit:
    'メール送信回数の上限に達しました。しばらく時間をおいて再度お試しください',
};

export function toJapaneseAuthErrorMessage(error: AuthError): string {
  return MESSAGES[error.code ?? ''] ?? '処理に失敗しました。時間をおいて再度お試しください';
}
