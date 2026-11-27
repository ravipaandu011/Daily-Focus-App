# Android APK Local Build & Telegram Delivery Guide

This project uses a standardized, project-agnostic Windows PowerShell build script ([build-apk.ps1](./build-apk.ps1)) and npm scripts to compile Android Debug and Release APKs locally, move each finished APK into a single shared output directory, and optionally deliver builds to Telegram.

---

## 1. Prerequisites & Environment Variables

Ensure the following tools and Windows environment variables are installed and configured:

| Requirement | Details |
| :--- | :--- |
| **Node.js & npm** | Installed and available on `PATH` (used by Expo/React Native autolinking and JS bundling). |
| **JDK 17+** | Set `JAVA_HOME` to your JDK 17+ directory (e.g., `C:\Program Files\Eclipse Adoptium\jdk-17...`). `build-apk.ps1` prepends `%JAVA_HOME%\bin` **in-process only** so Gradle uses `JAVA_HOME` even if another JDK appears earlier on `PATH`. |
| **Android SDK** | Install Android SDK Build-Tools, Platform SDK, and CMake (3.31+ recommended on Windows for long Ninja paths). Set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) or configure `sdk.dir` in `android\local.properties`. |
| **PowerShell** | Windows PowerShell 5.1+ (built into Windows). |

---

## 2. Native `android\` Directory Setup

- **Existing `android\` folder (Current Project):** This project is an **Expo prebuilt** project with an existing `android\` directory and Gradle wrapper (`gradlew.bat`, `gradle\wrapper\gradle-wrapper.jar`, `gradle\wrapper\gradle-wrapper.properties`). `build-apk.ps1` reuses `android\` as-is without overwriting native customizations.
- **New Expo projects without `android\`:** Generate the native folder non-destructively before building:
  ```powershell
  npx expo prebuild --platform android --no-install
  ```
  > Do **not** pass `--clean` if you have custom native changes inside `android\`.
- **React Native CLI projects:** Keep the standard `android\` folder and Gradle wrapper committed with your project.

---

## 3. Build Commands

Builds run incrementally by default (no `clean` step before every build) for fast rebuilds.

### Debug APK
```powershell
.\build-apk.ps1
# or via npm:
npm run apk:debug
```

### Release APK
```powershell
.\build-apk.ps1 -Configuration Release
# or via npm:
npm run apk:release
```

### Single-ABI Build (Faster & Smaller APK)
By default, `android\gradle.properties` builds `armeabi-v7a,arm64-v8a,x86,x86_64`. `build-apk.ps1` also passes `-Pexpo.useLegacyPackaging=true` (also enabled in `android\gradle.properties`) so native `.so` libraries are zip-compressed inside the APK for smaller files and faster uploads. To target modern physical Android phones only (`arm64-v8a`), pass `-Architectures`:
```powershell
.\build-apk.ps1 -Configuration Release -Architectures arm64-v8a
```

### Additional Parameters
| Parameter | Default | Description |
| :--- | :--- | :--- |
| `-Configuration` | `'Debug'` | Positional parameter (`Debug` or `Release`). |
| `-ProjectName` | `''` | Optional output filename prefix override. Auto-detected when omitted. |
| `-OutputDir` | `''` | Optional destination folder override. |
| `-Architectures` | `''` | Comma-separated ABIs passed via `-PreactNativeArchitectures=...`. |
| `-KeepGradleApk` | `$false` | Copies the APK instead of moving it, leaving a duplicate inside `android\app\build\outputs\apk\`. |
| `-SendTelegram` | `$false` | Sends the finished APK (or a build summary if over 50 MB) to Telegram. |

### Manual Clean (When Needed)
If native dependencies, CMake caches, or Gradle build artifacts become stale, run a manual clean:
```powershell
.\android\gradlew.bat -p android clean
```
And to stop background Gradle daemons after building:
```powershell
.\android\gradlew.bat --stop
```

---

## 4. Output Folder & Filename Resolution

Each finished APK is **moved** out of `android\app\build\outputs\apk\<variant>\` so only one copy exists per build (unless `-KeepGradleApk` is passed).

### Output Directory Resolution Order
1. `-OutputDir` parameter (if supplied)
2. `APK_OUTPUT_DIR` environment variable (process or User env; useful for projects stored outside `E:\Development\`)
3. Existing sibling folder `..\Local Apk's` (auto-resolves to `E:\Development\Local Apk's` for projects under `E:\Development\`) or `..\apk`
4. `<ProjectRoot>\apk` fallback

### Output Filename Auto-Detection Order
The script detects `<ProjectName>` dynamically in this order and produces `<ProjectName>-debug.apk` or `<ProjectName>-release.apk`:
1. `-ProjectName` parameter (if supplied)
2. `package.json` (`name`, stripping any `@scope/`) -> for this project: `daily-focus`
3. `app.json` (`name`, `expo.slug`, or `expo.name`)
4. `android\settings.gradle(.kts)` (`rootProject.name`)
5. Project folder name, sanitized for Windows filenames

---

## 5. Telegram Delivery Setup (`-SendTelegram`)

Configure the following Windows **User** (or process) environment variables without committing secrets to git:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from `@BotFather` (`<bot_id>:<secret>`). |
| `TELEGRAM_CHAT_ID` | Yes | Target user/group `chat.id` (must **not** be the bot's own ID from `getMe`). |
| `TELEGRAM_API_ID` | No | Optional Telegram API ID from `my.telegram.org` for fast parallel MTProto uploads (up to 2 GB). |
| `TELEGRAM_API_HASH` | No | Optional Telegram API hash paired with `TELEGRAM_API_ID`. |
| `TELEGRAM_MTPROTO_SCRIPT` | No | Optional override path to `send-apk.mjs` (auto-detects `..\telegram-uploader\send-apk.mjs`). |
| `TELEGRAM_API_BASE` | No | Custom self-hosted Telegram Bot API base URL (lifts the 50 MB upload cap). |
| `APK_SHARE_URL` | No | Optional download URL included in summary notices when the APK exceeds 50 MB. |

### Finding Your Real `TELEGRAM_CHAT_ID`
1. Open your bot in Telegram and send it any message (e.g., `/start`).
2. Call `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in your browser or PowerShell and copy `result[0].message.chat.id`.
   > Do **not** use `result.id` from `getMe` — that is the bot's own ID, and bots cannot message themselves. `build-apk.ps1` rejects `TELEGRAM_CHAT_ID` if it matches the bot ID prefix.

### 50 MB Standard Bot API Limit
- On the standard Telegram Bot API (`https://api.telegram.org`), files **<= 50 MB (`52,428,800` bytes)** are uploaded directly via `sendDocument`.
- If the APK **exceeds 50 MB** (common for universal 4-ABI builds), the script sends a text build summary via `sendMessage` (including `APK_SHARE_URL` if set) and suggests using `-Architectures arm64-v8a` or a custom `TELEGRAM_API_BASE`.

Example command:
```powershell
.\build-apk.ps1 -Configuration Release -Architectures arm64-v8a -SendTelegram
```

---

## 6. Release Signing Status & Production Keystore Setup

### Current Status
In [android/app/build.gradle](./android/app/build.gradle), `buildTypes.release` currently uses `signingConfig signingConfigs.debug` (there is no `signingConfigs.release` block configured).
- Consequently, `daily-focus-release.apk` builds cleanly for local testing and sideloading, **but it is debug-signed** and cannot be uploaded to Google Play.
- `build-apk.ps1` automatically prints a warning whenever `-Configuration Release` runs without a dedicated `release` signing config.

### Configuring a Production Keystore Safely
Never commit `.jks`/`.keystore` files or plaintext passwords to git. Instead:
1. Generate a release keystore outside the repo (or in a gitignored path such as `android\app\release.keystore`, since `*.jks` / `*.keystore` are not for public commits—verify `.gitignore` covers your keystore extension).
2. Store credentials in a **gitignored** `android\gradle.properties` (or user `~/.gradle/gradle.properties`) or read them from environment variables in `android\app\build.gradle`:
   ```groovy
   signingConfigs {
       release {
           if (System.getenv("ANDROID_KEYSTORE_PATH") || project.hasProperty("MYAPP_UPLOAD_STORE_FILE")) {
               storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: MYAPP_UPLOAD_STORE_FILE)
               storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: MYAPP_UPLOAD_STORE_PASSWORD
               keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: MYAPP_UPLOAD_KEY_ALIAS
               keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: MYAPP_UPLOAD_KEY_PASSWORD
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```

---

## 7. Reusing This Setup in Other Projects

`build-apk.ps1` contains zero hardcoded project names, paths, tokens, or drive letters. To adopt it in another React Native or Expo project:
1. Copy `build-apk.ps1` into the root of the new project.
2. Add these two scripts to `"scripts"` in the new project's `package.json`:
   ```json
   "apk:debug": "powershell -NoProfile -ExecutionPolicy Bypass -File ./build-apk.ps1 -Configuration Debug",
   "apk:release": "powershell -NoProfile -ExecutionPolicy Bypass -File ./build-apk.ps1 -Configuration Release"
   ```
3. If the other project lives outside `E:\Development\`, set `APK_OUTPUT_DIR=E:\Development\Local Apk's` in your Windows User environment variables to route all APKs into the same shared folder.
