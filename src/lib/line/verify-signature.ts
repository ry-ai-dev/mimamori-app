import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * LINE Webhookの署名検証。x-line-signatureヘッダーは、
 * リクエストボディ（生のバイト列）をチャネルシークレットでHMAC-SHA256し、
 * Base64エンコードした値と一致する必要がある。
 * https://developers.line.biz/ja/reference/messaging-api/#signature-validation
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): boolean {
  if (!signature) return false;

  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
