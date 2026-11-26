# Daily Focus

A daily planner for Android: plan your tasks day by day and keep a notes journal, synced to your account.

**[⬇ Download the latest APK](https://github.com/ravipaandu011/Daily-Focus-App/releases/latest)**

## Features

**Tasks**
- Plan tasks for any day; browse days with the date strip or the month calendar
- Priority, tags, subtasks and notes on each task
- Pin, complete, move to another day or duplicate, one at a time or many at once
- Move unfinished tasks from past days to today in one tap

**Notes**
- A day-by-day journal: title, text, colour and pin
- Saves automatically while you type, plus a Save button
- Share or copy a note, or move it to another day

**Everything else**
- **Recycle Bin** for deleted tasks and notes: restore or delete forever
- **Undo** right after deleting
- **Daily reminders** in the morning and evening, at times you choose
- **Cloud sync** between your devices; changes made offline are sent when you're back online
- **Backup and restore** as a JSON file
- Light and dark theme

## Install

1. Download the APK from the [latest release](https://github.com/ravipaandu011/Daily-Focus-App/releases/latest) on your Android phone.
2. Open it. If asked, allow installing apps from your browser or file manager.
3. Create an account with your email and a password, then sign in.

## For developers

Built with [Expo](https://expo.dev) (React Native, TypeScript) and [Supabase](https://supabase.com) for sign-in and sync.

### Run the app

```bash
npm install
npx expo run:android
```

### Use your own Supabase project

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. This creates the `todos` and `notes` tables with row-level security.
2. Put your project URL and publishable key in [`src/lib/supabase.ts`](src/lib/supabase.ts).
3. In Authentication → Sign In / Providers → Email, keep sign-ups on and turn off "Confirm email".

### Build the APK

```bash
cd android
./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`.

On Windows, if the build fails with `ninja: error: mkdir(...)`, the build paths are too long for the old CMake. Point Gradle at CMake 3.31 or newer in `android/local.properties`:

```properties
cmake.dir=C\:/Users/<you>/AppData/Local/Android/Sdk/cmake/3.31.6
```

### Project structure

```
src/
  app/          Screens and navigation (Expo Router)
  features/
    tasks/      Task list, task context, storage and components
    notes/      Notes journal, context, storage and components
    auth/       Sign-in / sign-up screen and auth context
    settings/   Settings, backup and the Recycle Bin
  components/   Shared UI (header, calendar, dialogs, tab bar)
  lib/          Supabase client and the offline sync queue
  utils/        Dates, reminders and helpers
plugins/        Expo config plugins
supabase/       Database schema
```
