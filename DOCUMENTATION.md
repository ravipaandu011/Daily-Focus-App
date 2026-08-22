# Daily Focus - End-to-End Technical & Feature Documentation

> **Application Name**: Daily Focus (Personal Productivity Suite)  
> **Framework**: React Native 0.76+ & Expo SDK 54  
> **Routing**: Expo Router (File-based Tabs Navigation)  
> **Language**: TypeScript (Strict Mode)  
> **Design System**: Google Material 3 (M3) Rounded Squircle & Pill Aesthetics  
> **Data Persistence**: Offline-First Local Storage (`@react-native-async-storage/async-storage`)  

---

## 📑 Table of Contents
1. [Executive Overview](#1-executive-overview)
2. [Module & Directory Architecture](#2-module--directory-architecture)
3. [Component Architecture & Responsibilities](#3-component-architecture--responsibilities)
4. [State Management & Data Layer](#4-state-management--data-layer)
5. [Utility Modules & Business Logic](#5-utility-modules--business-logic)
6. [End-to-End Feature Reference](#6-end-to-end-feature-reference)
7. [Data Models & Schema](#7-data-models--schema)
8. [Design System & Theming](#8-design-system--theming)
9. [Developer Guide & Verification](#9-developer-guide--verification)

---

## 1. Executive Overview

**Daily Focus** is an offline-first, high-performance personal task management application built with Expo SDK 54 and React Native. It replaces cluttered, generic to-do lists with a categorized, distraction-free interface featuring 5 distinct life verticals, a centralized action toolbar, gamification milestones, a Pomodoro focus timer, interactive streak tracking, subtask checklists, and automated recurrence.

### Key Highlights
- **5 Isolated Life Sections**: `💼 Work`, `📚 Learn`, `🏋️ Gym`, `🏠 Home`, and `🎯 Personal`.
- **Dynamic Theming**: Dynamic header branding and gradient accents that shift colors seamlessly per active section.
- **Centralized Action Toolbar**: Action icons located directly under the section heading for 1-tap actions on highlighted tasks.
- **Offline-First & Private**: 100% of data is stored securely on-device with full JSON export and restore capabilities.

---

## 2. Module & Directory Architecture

```
Personal-To-DO-App/
├── app/                              # Expo Router file-based pages
│   ├── (tabs)/                       # 5 Main Category Tab Screens
│   │   ├── _layout.tsx               # Custom Bottom Tab Bar with gradient active pills
│   │   ├── index.tsx                 # 💼 Work Todo screen
│   │   ├── education.tsx             # 📚 Learn Todo screen
│   │   ├── gym.tsx                   # 🏋️ Gym Todo screen
│   │   ├── home.tsx                  # 🏠 Home Todo screen
│   │   └── other.tsx                 # 🎯 Personal Todo screen
│   └── _layout.tsx                   # Root Provider Shell (Theme & Todo Providers)
├── components/                       # Modular UI Components
│   ├── add-task-modal.tsx            # Task creation modal with single/batch/subtasks/recurrence
│   ├── analytics-modal.tsx           # 7-day bar chart & Milestone Badges showcase
│   ├── calendar-modal.tsx            # Full interactive monthly calendar grid
│   ├── confetti-celebration.tsx      # 100% completion particle burst modal
│   ├── date-navigator.tsx            # Day stepper & Yesterday/Today/Tomorrow chips
│   ├── edit-task-modal.tsx           # Task modification sheet
│   ├── focus-timer-modal.tsx         # 25m Pomodoro focus countdown ring
│   ├── haptic-tab.tsx                # Haptic feedback wrapper for tab button clicks
│   ├── recycle-bin-modal.tsx         # Trash bin with restore & permanent purge
│   ├── rollover-banner.tsx           # Smart past-pending task carryover prompt
│   ├── routines-modal.tsx            # Habit checklists & custom routine creator
│   ├── section-todo-screen.tsx       # Universal screen engine integrating all features
│   ├── settings-backup-modal.tsx     # Theme switcher, Standup exporter & Backup hub
│   ├── streak-modal.tsx              # Interactive Streak & Consistency dashboard
│   ├── task-filter-bar.tsx           # Instant search input & status filter chips
│   ├── task-item.tsx                 # Material 3 rounded task card with full-width text
│   ├── task-list.tsx                 # FlatList with heading action toolbar & Select All
│   ├── task-transfer-modal.tsx       # 1-tap category mover & task duplicator
│   └── undo-toast.tsx                # Floating non-overlapping 5s Undo snackbar
├── constants/                        # Global Constants & Tokens
│   ├── sections.ts                   # Category definitions, colors, and gradients
│   └── theme.ts                      # Light and Dark theme design tokens
├── context/                          # Global React State Contexts
│   ├── theme-context.tsx             # System/Light/Dark theme management
│   └── todo-context.tsx              # Core Todo CRUD, batching, and persistence engine
├── hooks/                            # Custom React Hooks
│   ├── use-color-scheme.ts           # Dynamic color scheme consumer
│   ├── use-color-scheme.web.ts       # Web color scheme polyfill
│   ├── use-theme-color.ts            # Palette resolver hook
│   └── use-todos.ts                  # Todo context consumer hook
├── storage/                          # Low-Level Storage Layer
│   └── todo-storage.ts               # AsyncStorage serialization and deserialization
├── types/                            # TypeScript Type Definitions
│   └── todo.ts                       # TodoItem, Subtask, Recurrence, Badge schemas
└── utils/                            # Pure Algorithmic & Helper Modules
    ├── achievements.ts               # Gamification badges calculator
    ├── analytics.ts                  # 7-day activity & category breakdown math
    ├── backup.ts                     # JSON export and import validator
    ├── date.ts                       # Key formatting, date math, and human display
    ├── notifications.ts              # Local reminder preference management
    ├── recurrence.ts                 # Next occurrence schedule calculation
    ├── routines.ts                   # Habit templates & AsyncStorage persistence
    ├── standup.ts                    # Slack/WhatsApp standup text formatter
    └── streak.ts                     # Daily completion streak algorithm
```

---

## 3. Component Architecture & Responsibilities

### Core Screens & Views
| Component | File | Responsibility |
| :--- | :--- | :--- |
| **`SectionTodoScreen`** | `components/section-todo-screen.tsx` | Universal orchestrator for all 5 tabs. Mounts the header, DateNavigator, TaskFilterBar, TaskList, and all application modals. |
| **`TaskList`** | `components/task-list.tsx` | Renders the task FlatList, the **"Tasks"** heading with **"Select All"** toggle, and the **Heading Action Toolbar** (`✓`, `⏱️`, `⭐`, `📅`, `🔀`, `✏️`, `🗑️`). |
| **`TaskItem`** | `components/task-item.tsx` | Renders the individual Material 3 squircle task card with full-width text, squircle checkbox, tags, subtask progress pills, and selectable highlight. |
| **`DateNavigator`** | `components/date-navigator.tsx` | Header date stepper with previous/next day arrows, formatted date title (tap to open Calendar), and Yesterday/Today/Tomorrow quick chips. |
| **`TaskFilterBar`** | `components/task-filter-bar.tsx` | Houses the pill-shaped instant search input and status filter chips (`All`, `Pending`, `Done`). |

### Interactive Feature Modals
| Component | File | Responsibility |
| :--- | :--- | :--- |
| **`StreakModal`** | `components/streak-modal.tsx` | Opened by tapping `🔥 Xd`. Shows current streak, 7-day consistency heatmap, and milestone trophies. |
| **`FocusTimerModal`** | `components/focus-timer-modal.tsx` | Immersive Pomodoro countdown ring with 15m/25m/45m preset buttons, pause/resume, and 1-tap task complete. |
| **`CalendarModal`** | `components/calendar-modal.tsx` | Interactive monthly calendar grid with month stepper (`<` and `>`) and task activity heat dots. |
| **`AnalyticsModal`** | `components/analytics-modal.tsx` | Displays 7-day completion bar chart, category effort distribution, and Achievement Trophies showcase. |
| **`SettingsBackupModal`** | `components/settings-backup-modal.tsx` | Theme selector (System/Light/Dark), Standup summary sharing sheet, and JSON Backup Export/Import. |
| **`RoutinesModal`** | `components/routines-modal.tsx` | Pre-built routines (Work Startup, Gym Split, Study Split, etc.) and custom routine template creator. |
| **`TaskTransferModal`** | `components/task-transfer-modal.tsx` | 1-tap category transfer to move tasks between tabs and clone/duplicate tasks to future dates. |
| **`RecycleBinModal`** | `components/recycle-bin-modal.tsx` | Houses deleted tasks with individual restore, permanent purge, and empty bin actions. |
| **`ConfettiCelebration`** | `components/confetti-celebration.tsx` | Particle confetti animation and motivational cheer triggered when all tasks for the day are finished. |
| **`AddTaskModal`** | `components/add-task-modal.tsx` | Modal with single/batch multi-line input, date chips, estimated duration tags, recurrence options, subtasks builder, and notes. |
| **`EditTaskModal`** | `components/edit-task-modal.tsx` | Edit task text, tag, recurrence rule, subtasks checklist, and context notes. |
| **`UndoToast`** | `components/undo-toast.tsx` | Non-overlapping floating snackbar that allows 1-tap undoing of task deletion within 5 seconds. |

---

## 4. State Management & Data Layer

### `TodoContext` (`context/todo-context.tsx`)
The global state provider managing all task state, active filters, search, and storage synchronization:

- **State Managed**:
  - `todos: TodoItem[]`: Active tasks across all sections and dates.
  - `binTodos: TodoItem[]`: Deleted tasks held in the Recycle Bin.
  - `selectedDate: string`: Active date key (`YYYY-MM-DD`).
  - `searchQuery: string`: Current search filter string.
  - `statusFilter: StatusFilter`: Active filter (`'all' | 'pending' | 'completed'`).
  - `streak: number`: Real-time computed daily completion streak.
  - `isUndoVisible: boolean`: Visibility state of the 5-second Undo snackbar.

- **Primary Actions**:
  - `addTodo(params)`: Adds a single task with optional subtasks, recurrence, and notes.
  - `addBatchTodos(section, texts, date, tag)`: Parses and inserts multiple tasks simultaneously.
  - `toggleTodo(id)`: Checks/unchecks a task. If recurring and completed, automatically schedules the next occurrence for that future date.
  - `toggleSubtask(todoId, subtaskId)`: Toggles individual subtask checklist bullets.
  - `togglePinTodo(id)`: Pins/unpins task to the top of the list.
  - `moveToDate(id, newDate)`: Reschedules task to another date.
  - `moveToSection(id, newSection)`: Moves task across categories.
  - `duplicateTodo(id, targetDate, targetSection)`: Clones a task to a target date/tab.
  - `deleteTodo(id)`: Moves task to Recycle Bin and triggers the Undo snackbar.
  - `deleteBatchTodos(ids)`: Moves multiple selected tasks into the Recycle Bin at once.
  - `toggleBatchComplete(ids, completed)`: Batch completes/uncompletes selected tasks.
  - `moveBatchToDate(ids, newDate)`: Batch moves selected tasks to tomorrow or a target date.
  - `restoreFromBin(id)`: Restores a task from the bin back to its original list.
  - `emptyBin()`: Permanently deletes all items in the Recycle Bin.
  - `importBackupData(newTodos, newBin)`: Replaces state from validated JSON backup.

---

## 5. Utility Modules & Business Logic

### `utils/date.ts`
- `formatDateKey(date: Date): string`: Formats a Date object to standardized `YYYY-MM-DD`.
- `getTodayKey()`: Returns today's date in `YYYY-MM-DD`.
- `getYesterdayKey()` / `getTomorrowKey()`: Returns yesterday/tomorrow in `YYYY-MM-DD`.
- `addDaysToDateKey(dateKey, days)`: Adds or subtracts `N` days from any date key.
- `formatDateForDisplay(dateKey)`: Converts key into human-friendly format (e.g. `"Today, Aug 20"`, `"Yesterday, Aug 19"`, `"Tomorrow, Aug 21"`).

### `utils/streak.ts`
- `calculateCompletionStreak(todos: TodoItem[]): number`: Evaluates all completed dates. Checks if today or yesterday has completed tasks, and counts backwards consecutively to compute the active streak.

### `utils/recurrence.ts`
- `calculateNextRecurrenceDate(currentDateKey, recurrence)`: Computes the next date key based on rule:
  - `'daily'`: `+1 day`
  - `'weekdays'`: `+1 day` (automatically skips Saturday & Sunday to Monday)
  - `'weekly'`: `+7 days`
  - `'monthly'`: `+1 month`

### `utils/achievements.ts`
- `computeAchievements(todos: TodoItem[])`: Evaluates task history and computes unlocked trophies and progress:
  - 🚀 **First Step**: First completed task.
  - ⚡ **Momentum**: 10 completed tasks.
  - 🎯 **Centurion**: 50 completed tasks.
  - 🔥 **Streak Master**: 7-day completion streak.
  - 🏆 **Flawless Day**: Finished all tasks on a day with 3+ tasks.
  - 📋 **Detail Oriented**: 5 completed subtasks.
  - 🔁 **Habit Builder**: Setup an auto-repeating task.

### `utils/analytics.ts`
- `computeAnalytics(todos)`: Computes:
  - Total tasks, completed tasks, and completion percentage.
  - 7-day completion activity data for the bar chart.
  - Category breakdown with effort distribution percentages and top productive category.

### `utils/standup.ts`
- `generateStandupText(todos, dateKey)`: Generates clean markdown standup summaries formatted with `✅ Completed` and `⏳ In Progress` sections, ready to copy or share via native Share sheets.

### `utils/backup.ts`
- `generateBackupJson(todos, binTodos)`: Serializes application data into a formatted JSON schema with timestamp and versioning.
- `parseAndValidateBackup(jsonString)`: Validates uploaded JSON structure before restoring.

---

## 6. End-to-End Feature Reference

### 1. Categorized Section Workspaces
The app is organized into 5 dedicated life areas accessible via the custom bottom navigation bar:
- 💼 **Work**: Professional deadlines, deliverables, and meetings.
- 📚 **Learn**: Courses, study milestones, books, and skill building.
- 🏋️ **Gym**: Workout splits, cardio sessions, and hydration habits.
- 🏠 **Home**: Chores, grocery lists, and home maintenance.
- 🎯 **Personal**: Personal goals, mindfulness, and reflections.

### 2. Heading Action Toolbar & 1-Tap Selection
- Located right below the `Tasks` header.
- **Actions**:
  - `✓` **Done**: Complete or uncomplete selected task(s).
  - `⏱️` **Focus**: Launch 25m Pomodoro Focus Timer for the selected task.
  - `⭐` **Pin**: Pin or unpin task to top of list.
  - `📅` **Tomorrow**: Reschedule selected task(s) to tomorrow.
  - `🔀` **Move**: Open Category Transfer & Duplicate modal.
  - `✏️` **Edit**: Open Edit Details modal.
  - `🗑️` **Delete**: Move selected task(s) to Recycle Bin.
- **Workflow**: Tap any task card to highlight it, then tap any toolbar icon to apply that action immediately.

### 3. Multi-Select & "Select All"
- Tap **"Select All"** in the header to select all tasks on screen.
- All selected task checkboxes illuminate with active checkmarks (`✓`).
- Tapping **Done**, **Tomorrow**, or **Delete** in the toolbar executes batch operations across all selected tasks simultaneously.

### 4. Interactive Streak Dashboard (`🔥 Xd`)
- Tap the **`🔥 {streak}d`** pill in the top header to open the **Streak & Consistency Dashboard**:
  - Roaring flame hero card with active day status.
  - 7-day consistency heatmap tracking completed days.
  - Unlockable milestone badges (3-Day Spark, 7-Day Habit, 14-Day Inferno, 30-Day Legend).

### 5. Pomodoro Focus Timer (`components/focus-timer-modal.tsx`)
- Focus countdown ring with smooth animations.
- Presets: **15m**, **25m (Default)**, and **45m**.
- Play, Pause, and 1-tap **"Complete Task & Finish"** button with haptic feedback.

### 6. Interactive Monthly Calendar Grid (`components/calendar-modal.tsx`)
- Tap the formatted date header in the Date Navigator to open the full monthly calendar.
- Month navigation `<` and `>`.
- Colored task activity heat dots on days with scheduled tasks.
- 1-tap selection jumps directly to any date in the year.

### 7. Subtasks & Mini Checklists
- Tasks can have subtask bullet items.
- Cards display an expandable checklist with live checkable circles and a progress pill (e.g. `2/3`).

### 8. Recurring Tasks Engine
- Set tasks to repeat **Daily**, **Mon–Fri (Weekdays)**, **Weekly**, or **Monthly**.
- When completed, the system automatically schedules the next occurrence for that future date and displays an orange `🔁 RECURRING` badge.

### 9. Habit & Routine Templates (`components/routines-modal.tsx`)
- Pre-built checklist bundles for all sections (Work Startup, Gym Split, Study Split, Home Reset, Wellness).
- **Custom Routine Builder**: Create, name, assign emojis/sections, and save personal routines to AsyncStorage with 1-tap batch adding into today's list.

### 10. Standup Generator & Sharing
- Inside Settings modal: Formats today's deliverables into clean text with 1-tap **Copy to Clipboard** and **Share to Slack / WhatsApp**.

### 11. Recycle Bin & 5-Second Undo Toast
- Deleted tasks are safely held in the Recycle Bin.
- Floating non-overlapping Undo snackbar allows instant restoration within 5 seconds of deletion.

### 12. 100% Daily Completion Confetti Celebration
- Completing the final pending task of the day triggers an animated confetti particle burst with a trophy and motivational cheer.

---

## 7. Data Models & Schema

### `TodoItem` (`types/todo.ts`)
```typescript
export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  section: 'work' | 'education' | 'gym' | 'home' | 'personal';
  date: string; // 'YYYY-MM-DD'
  pinned?: boolean;
  tag?: string; // '15m' | '30m' | '1h' | 'urgent' | 'idea'
  recurrence?: RecurrenceType;
  subtasks?: SubtaskItem[];
  notes?: string;
  deletedAt?: number;
}
```

### `AchievementBadge` (`types/todo.ts`)
```typescript
export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
}
```

---

## 8. Design System & Theming

### Material 3 Radius Hierarchy
- **Modals & Bottom Sheets**: `borderTopLeftRadius: 32`, `borderTopRightRadius: 32`
- **Task Cards**: `borderRadius: 24`
- **Search Bar & Date Navigator**: `borderRadius: 22`
- **Buttons & Input Fields**: `borderRadius: 18`
- **Date & Tag Chips**: `borderRadius: 14 - 16`
- **Checkboxes**: `borderRadius: 10` (Squircle)
- **Badges & Streak Pills**: `borderRadius: 10 - 12`

### Section Colors & Gradients (`constants/sections.ts`)
| Section | Emoji | Primary Color | Gradient | Accent |
| :--- | :---: | :---: | :---: | :---: |
| **Work** | 💼 | `#3B82F6` | `['#3B82F6', '#1D4ED8']` | Blue |
| **Learn** | 📚 | `#8B5CF6` | `['#8B5CF6', '#6D28D9']` | Purple |
| **Gym** | 🏋️ | `#10B981` | `['#10B981', '#047857']` | Green |
| **Home** | 🏠 | `#F59E0B` | `['#F59E0B', '#D97706']` | Orange |
| **Personal** | 🎯 | `#EC4899` | `['#EC4899', '#BE185D']` | Pink |

---

## 9. Developer Guide & Verification

### Running the Development Server
```bash
# Start Expo development server with tunnel
npx expo start --tunnel

# Run on Android emulator / physical device
npx expo run:android

# Run on iOS simulator / physical device
npx expo run:ios
```

### Code Quality & Validation
```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint validation
npm run lint
```
*Current status*: **0 TypeScript errors, 0 ESLint warnings.**
