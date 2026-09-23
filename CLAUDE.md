# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## mimamori-app 固有のルール

- このプロジェクトはNext.js Webアプリであり、親フォルダ（APIキー実装/CLAUDE.md）の規約はPython CLIツール向けに書かれたものであるため、そのままでは適用されない
- APIキー・シークレットは`.env.local`に置き、`process.env`経由で読み込む
- `.env.local`はGit管理対象外にする（`.gitignore`に含める）
- `credentials.json`や`token_*.json`のようなファイルをリポジトリに含めない、という親の思想は引き続きこのプロジェクトでも守る

## Commands

```bash
npm run dev     # 開発サーバー起動 (http://localhost:3000)
npm run build   # 本番ビルド
npm run start   # 本番サーバー起動（要build）
npm run lint    # ESLint (eslint-config-next: core-web-vitals + typescript)
```

テストスイートは未導入（テストコマンドなし）。単体で動作確認する場合は該当ルートを`npm run dev`経由で直接叩く。

## Architecture

離れて暮らす高齢者の安否をLINE通知の応答で確認し、家族がWebダッシュボードで確認する見守りアプリ。詳細な要件・画面遷移は `requirements.md` を参照。Next.js App Router (TypeScript, Tailwind CSS v4) + Supabase (Postgres/Auth/RLS) + LINE Messaging API。定期実行（朝の通知・未応答チェック）はこのリポジトリ外のスケジューラ（GitHub Actions想定）からcronルートを叩く構成。

### Supabaseクライアントの使い分け（重要）

`src/lib/supabase/` に3種類のクライアントファクトリがあり、呼び出し文脈で使い分ける:

- `client.ts` の `createClient()` — ブラウザ用（Client Component）。anon keyを使用。
- `server.ts` の `createClient()` — Server Component / Server Action用。cookieからユーザーセッションを復元し、anon keyでRLSが効いた状態でクエリする。認可チェックはこの層でセッション有無を見て行う。
- `admin.ts` の `createAdminClient()` — service_role keyを使いRLSを完全にバイパスする。ユーザーセッションを持たないサーバー処理（LINE Webhook、cronルート）専用。**ユーザーからのリクエストを直接処理するルートで安易に使わない。**

`middleware.ts` + `lib/supabase/middleware.ts` が全リクエスト（静的アセット除く）でセッションを`getUser()`によりリフレッシュし、cookieを書き換える。

### 認証・フォームのパターン

`login`/`signup`/`createWatchee`/`regenerateLinkCode` はいずれも `'use server'` の Server Action。対応するClient Componentは `useActionState` でフォーム状態(`{ error?, success? }`)とpending状態を扱う（例: `src/app/login/login-form.tsx` + `src/app/login/actions.ts`）。Supabaseの認証エラーは `lib/supabase/auth-error-messages.ts` の `toJapaneseAuthErrorMessage()` でエラーコードから日本語メッセージへマッピングする（未知のコードはフォールバックメッセージ）。

### データモデル（マイグレーションファイルはリポジトリ内に無く、コードから推測される主要テーブル）

- `watchees` — 見守り対象者。`owner_id`（家族=Supabase Auth user）, `name`, `line_user_id`（LINE連携後に設定）, `link_code` / `link_code_expires_at`（6桁コード, 24時間TTL, `lib/watchees/link-code.ts`）
- `notifications` — 朝の安否確認通知の送信記録。`watchee_id`, `sent_at`, `line_message_id`
- `responses` — LINEからのpostback応答記録。`watchee_id`, `notification_id`（nullable — 不正/欠損なら未紐付け）, `status`, `responded_at`
- `alerts` — 未応答アラート。`watchee_id`, `notification_id` にユニーク制約があり、重複挿入(`23505`)は同時実行cronとの想定内競合として無視する

### LINE連携 (`src/lib/line/`)

- `push-message.ts` — サーバー→LINEのPush API呼び出し（cronの朝通知で使用）。`LINE_CHANNEL_ACCESS_TOKEN`未設定時は例外。
- `reply-message.ts` — Webhook内でのReply API呼び出し。replyTokenは数十秒で失効する使い捨てのため、失敗しても例外を投げず握りつぶす（応答記録処理を止めないため）。
- `verify-signature.ts` — `x-line-signature`ヘッダーをHMAC-SHA256+`timingSafeEqual`で検証。Webhookルートは生のリクエストボディ文字列に対して検証してから`JSON.parse`する必要がある。

### Webhook / Cronルート (`src/app/api/`)

- `line/webhook/route.ts` — LINEからのpostbackイベントを受信し`responses`に記録。署名検証必須。同一対象者からの10秒以内の連打は重複として記録をスキップするが、返信は毎回行う（連打時に本人を不安にさせないため）。LINEは非2xxをリトライするため、個々の記録失敗があっても常に200を返す。
- `cron/morning-notification/route.ts` — LINE連携済みの全対象者に朝の安否確認Push通知を送信し`notifications`レコードを作成。
- `cron/unresponsive-check/route.ts` — 送信から3時間（`UNRESPONSIVE_THRESHOLD_HOURS`）経過し未応答・未アラートの通知を検出して`alerts`を作成。

両cronルートとも `Authorization: Bearer $CRON_SECRET` ヘッダーで認証する。外部スケジューラから呼ばれる前提で、失敗は個別に`Promise.allSettled`で処理し、1件の失敗が全体を止めないようにしている。

### 環境変数

`.env.local`（Git管理外）に配置: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `CRON_SECRET`
