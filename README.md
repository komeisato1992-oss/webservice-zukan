This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## スプレッドシート連携（管理画面）

管理画面 URL: `/admin/spreadsheet`（メニュー「スプレッドシート連携」）

Supabase（正本）→ Googleスプレッドシートへ出力 → 編集 → 取得 → 差分確認 → 選択反映、の流れです。
読み込みだけでは公開DBは更新されません。シート: `services` / `plans` / `comparison_items` / `sync_info`

### Google Cloud 設定手順

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **Google Sheets API** を有効化
3. **サービスアカウント**を作成
4. JSONキーを発行（ダウンロードしたJSONは Git に追加しない）
5. JSON内の `client_email` を控える
6. 対象の Google スプレッドシートを開き、サービスアカウントのメールを **編集者** として共有（閲覧者では不可）
7. スプレッドシートの ID（URLの `/d/` と `/edit` の間）を控える
8. Vercel（または `.env.local`）に環境変数を登録して再デプロイ
9. 管理画面の「接続テスト」→「最新データを書き出す」で確認

### 環境変数

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=...
```

互換のため `GOOGLE_PRIVATE_KEY` / `GOOGLE_SHEET_ID` も参照します。秘密鍵の改行は `\n` 埋め込み可です。

### マイグレーション

以下を適用してください。

- `supabase/migrations/202607190002_spreadsheet_sync.sql`
- `supabase/migrations/202607190004_spreadsheet_sync_sessions.sql`

テーブル: `spreadsheet_sync_runs`（セッション）/ `spreadsheet_sync_changes` / `spreadsheet_sync_errors` / `service_field_overrides`

不足カラム案は `docs/spreadsheet-migration-proposal.md` を参照。
