@AGENTS.md

# mimamori-app 固有のルール

- このプロジェクトはNext.js Webアプリであり、親フォルダ（APIキー実装/CLAUDE.md）の規約はPython CLIツール向けに書かれたものであるため、そのままでは適用されない
- APIキー・シークレットは`.env.local`に置き、`process.env`経由で読み込む
- `.env.local`はGit管理対象外にする（`.gitignore`に含める）
- `credentials.json`や`token_*.json`のようなファイルをリポジトリに含めない、という親の思想は引き続きこのプロジェクトでも守る
