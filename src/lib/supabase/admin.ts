import { createClient } from '@supabase/supabase-js';

/**
 * service_role キーを使う管理者クライアント。RLSを完全にバイパスするため、
 * Webhookなどユーザーセッションを持たないサーバー側処理でのみ使用すること。
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
