'use server';

import { createClient } from '@/lib/supabase/server';
import { generateLinkCode, linkCodeExpiresAt } from '@/lib/watchees/link-code';
import { revalidatePath } from 'next/cache';

export type RegenerateLinkCodeState = { error?: string };

export async function regenerateLinkCode(
  watcheeId: string,
  _prevState: RegenerateLinkCodeState,
  _formData: FormData,
): Promise<RegenerateLinkCodeState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('watchees')
    .update({
      link_code: generateLinkCode(),
      link_code_expires_at: linkCodeExpiresAt(),
    })
    .eq('id', watcheeId);

  if (error) {
    return { error: 'コードの再発行に失敗しました。時間をおいて再度お試しください' };
  }

  revalidatePath(`/watchees/${watcheeId}`);
  return {};
}
