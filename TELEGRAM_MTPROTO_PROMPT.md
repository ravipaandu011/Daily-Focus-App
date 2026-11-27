# Add Fast Parallel MTProto Telegram Uploader (Teleproto / GramJS) to Windows APK Build Setup

Upgrade the existing `build-apk.ps1` Telegram delivery flow on Windows (`E:\Development`) to use a shared **MTProto** uploader (`teleproto`) for near-full-speed parallel uploads directly to Telegram's nearest DC (lifting the 50 MB Bot HTTP API limit up to 2 GB), while keeping `curl.exe` / `HttpClient` as automatic fallbacks and without adding dependencies to individual React Native / Expo projects.

## 1. Prerequisites & Environment Check
- Verify `node` is installed (`node --version`) and check `TELEGRAM_API_ID` (digits) and `TELEGRAM_API_HASH` (from `my.telegram.org`) in process or Windows User environment variables alongside `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Never print secret values.
- Do **not** run Gradle during this setup unless explicitly asked.

## 2. Set Up Shared MTProto Uploader (`..\telegram-uploader`)
Create a shared uploader folder in the parent workspace (e.g., `E:\Development\telegram-uploader\`) so every project under `E:\Development\` can reuse it without modifying app `package.json` files:
1. Initialize `package.json` (`npm init -y`) and install `teleproto` (`npm install teleproto --no-audit --no-fund`).
2. Create `send-apk.mjs` using `createRequire(import.meta.url)` to load `teleproto`, `teleproto/sessions` (`StringSession`), and `teleproto/extensions/Logger` (`Logger`, `LogLevel`):
   - Accept `--file <apkPath>`, `--caption <caption>`, and `--workers <n>` (default `4`, clamped `1..8`).
   - Read `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` from `process.env` (never CLI args); reject `TELEGRAM_CHAT_ID` if it matches the bot ID prefix (`token.split(':')[0]`).
   - Convert numeric `TELEGRAM_CHAT_ID` to `BigInt(chatId)` before calling `client.sendFile(...)` (passing numeric IDs as strings triggers `BOT_METHOD_INVALID` in bot mode).
   - Set `baseLogger: new Logger(LogLevel.ERROR)` and `connectionRetries: 5`.
   - Cache the bot session string in `.session-<botId>.txt` next to `send-apk.mjs` so subsequent runs connect without repeating bot auth; if a cached session fails auth, retry cleanly with `StringSession('')`.
   - Upload with `forceDocument: true`, `workers`, and a throttled `progressCallback` printing a single-line progress bar (`%`, `MB / total MB`, and `MB/s`), then print elapsed seconds and average `MB/s` on completion.
   - Redact `botToken` and `apiHash` from any error output and always `await client.disconnect()` in `finally`.

## 3. Update `build-apk.ps1` (PS 5.1 Compatible, Pure 7-Bit ASCII)
- Add `Resolve-MtprotoUploaderPath` checking in order:
  1. `TELEGRAM_MTPROTO_SCRIPT` (process or User env override)
  2. `..\telegram-uploader\send-apk.mjs` (sibling shared folder)
  3. `<ProjectRoot>\telegram-uploader\send-apk.mjs`
- Add `Invoke-TelegramMtprotoUpload` to set `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` in-process (restoring previous values in `finally`), temporarily set `$ErrorActionPreference = 'Continue'`, and run `node.exe` against `send-apk.mjs` with `--file`, `--caption`, and `--workers 4`.
- Update `Send-TelegramDelivery` (passing `-ProjectRoot`) so when standard `api.telegram.org` is targeted, `TELEGRAM_API_ID` + `TELEGRAM_API_HASH` + `node.exe` + `send-apk.mjs` are available, and APK size is `<= 2 GB` (`2,147,483,648` bytes), it uploads via MTProto first — falling back automatically (with a token/hash-redacted warning) to `curl.exe` / `HttpClient` (`<= 50 MB`) or `sendMessage` (`> 50 MB`) if MTProto fails or is unconfigured.
- Ensure output directory creation uses `[System.IO.Directory]::CreateDirectory($resolvedOutputDir) | Out-Null` (instead of `New-Item -LiteralPath`, which fails in Windows PowerShell 5.1).
- Keep `build-apk.ps1` **100% pure 7-bit ASCII** and use only approved PowerShell verbs (`Resolve-*`, `Invoke-*`).

## 4. Update `ANDROID_APK_BUILD.md`
Document the optional MTProto variables in the Telegram Delivery Setup table:
- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_MTPROTO_SCRIPT`

## 5. Verification (Without Running Gradle or Sending Unsolicited Messages)
1. Verify `build-apk.ps1` has `0` non-ASCII bytes, `0` AST parse errors, approved verbs only, and loads cleanly via `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Command .\build-apk.ps1"`.
2. Run `node --check` on `..\telegram-uploader\send-apk.mjs`.
3. Run a non-sending MTProto smoke check (`client.start({ botAuthToken })` + `client.getInputEntity(BigInt(chatId))` + `client.disconnect()`) to confirm DC connection, entity resolution, and `.session-<botId>.txt` creation.
4. Report verified DC ID, created/updated files, and the command to benchmark upload speed on an existing APK without rebuilding (`node "..\telegram-uploader\send-apk.mjs" --file "<apkPath>" --caption "MTProto test"`).
