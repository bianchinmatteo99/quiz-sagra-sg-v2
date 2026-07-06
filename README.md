# QuizSGv2 — Serverless realtime quiz

> **<span style="color:red">CURRENTLY UNDER DEVELOPMENT</span>**

## Overview

- **What it is:** a serverless web app implementing realtime quizzes using Firebase Realtime Database as the single communication channel.
- **Frontends:**
  - **User:** mobile frontend for participants ([src/index.html](src/index.html#L1))
  - **Admin:** controller for the quiz host ([src/admin/index.html](src/admin/index.html#L1))
  - **(TODO) Display:** presentation for audience screens ([src/display/index.html](src/display/index.html#L1))
  - **(TODO) Presenter:** planned presenter-facing UI

## Design principles

- **Single source of truth:** state is stored in Firebase; admin publishes changes, other endpoints react.
- **Modular:** logic is split into `people`, `quiz`, `games`, and `questions` so new games/questions are easy to add.
- **Extendable UI:** questions are decoupled from games — UI components are pluggable providers.

## Quick start (development)

### Prerequisites

- Node.js 16+
- npm or yarn

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Firebase emulator (recommended for local testing)

Create a `.env` file with these entries (replace values):

```env
VITE_FIREBASE_API_KEY=YOUR_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL=http://localhost:9000?ns=your-db
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_USE_FIREBASE_EMULATOR=true
```

Then start the emulator (Firebase CLI) and:

```bash
npm run dev
```

## Project layout (key folders)

- **src/** — main app sources
  - **admin/** — admin UI bootstrap and layout
  - **display/** — public display UI
  - **auth/** — login and auth helpers
  - **common/** — shared code: `database`, `quiz`, `games`, `questions`, `people`, and utilities
  - **user/** — participant UI code and state handling
- **public/** — static assets and `quiz_def.md` (quiz definition)
- **database.rules.json** — current Realtime DB rules (development)

## Important files

- [src/firebase-init.ts](src/firebase-init.ts#L1-L40): Firebase initialization and emulator wiring.
- [src/common/database/firebase.adapter.ts](src/common/database/firebase.adapter.ts#L1-L120): thin adapter used across the app.
- [src/common/quiz/quiz.manager.ts](src/common/quiz/quiz.manager.ts#L1-L200): central coordinator for quiz, people and games.

