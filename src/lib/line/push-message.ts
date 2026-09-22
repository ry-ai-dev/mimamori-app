const LINE_PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push';

type LineMessage = Record<string, unknown>;

type PushMessageResult = {
  messageId: string | null;
};

export async function pushMessage(to: string, messages: LineMessage[]): Promise<PushMessageResult> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKENが設定されていません');
  }

  const res = await fetch(LINE_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    throw new Error(`LINE Push APIエラー: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { sentMessages?: { id: string }[] };
  return { messageId: data.sentMessages?.[0]?.id ?? null };
}

export function buildMorningCheckMessage(notificationId: string): LineMessage[] {
  return [
    {
      type: 'template',
      altText: '朝の安否確認',
      template: {
        type: 'buttons',
        text: 'おはようございます。今日も元気ですか?',
        actions: [
          {
            type: 'postback',
            label: '元気です',
            data: `notification_id=${notificationId}&status=ok`,
          },
        ],
      },
    },
  ];
}
