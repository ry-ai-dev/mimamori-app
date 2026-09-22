const LINE_REPLY_ENDPOINT = 'https://api.line.me/v2/bot/message/reply';

/**
 * replyTokenは一度しか使えず、有効期限も短い（数十秒程度）。
 * 失敗しても呼び出し元の処理（応答記録）は止めたくないため、ここで例外は投げない。
 */
export async function replyMessage(replyToken: string, text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKENが設定されていません');
    return;
  }

  const res = await fetch(LINE_REPLY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!res.ok) {
    console.error('LINEへの返信に失敗しました:', res.status, await res.text());
  }
}
