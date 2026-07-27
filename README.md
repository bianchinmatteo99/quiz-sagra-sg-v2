# QuizSGv2 — Serverless realtime quiz

> **<span style="color:red">CURRENTLY UNDER DEVELOPMENT</span>**

## Overview

- **What it is:** a serverless web app implementing realtime quizzes with Firebase Realtime Database as the shared state channel.
- **Frontends:**
  - **User:** participant interface ([src/index.html](src/index.html#L1))
  - **Admin:** quiz host controls ([src/admin/index.html](src/admin/index.html#L1))
  - **Display:** audience screen ([src/display/index.html](src/display/index.html#L1))
  - **Presenter:** monitoring panel for live state and answers ([src/presenter/index.html](src/presenter/index.html#L1))

## Design principles

- **Single source of truth:** quiz state is stored in Firebase; admin writes transitions and other clients react through listeners.
- **Modular core:** shared logic is split into `people`, `quiz`, `games`, `questions`, and `database` modules.
- **Pluggable game surfaces:** admin, display, and presenter behaviors are selected by game kind via registries.

## Quick start (development)

### Prerequisites

- Node.js LTS
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
  - **admin/** — admin bootstrap and host flow start
  - **display/** — audience display bootstrap
  - **presenter/** — presenter monitor bootstrap
  - **auth/** — login and auth guard scripts
  - **common/** — shared modules (`database`, `quiz`, `games`, `questions`, `people`, navigation, utilities)
  - **user/** — participant state and views
- **public/** — static assets and `quiz_def.md` (quiz definition)
- **database.rules.json** — current Realtime DB rules (development)

## Documentation map

- [ARCHITECTURE.md](ARCHITECTURE.md): system structure and runtime flow.
- [FIREBASEDB.md](FIREBASEDB.md): database paths, payload shapes, and rule implications.
- [QUIZDEF.md](QUIZDEF.md): markdown quiz-definition format loaded from `public/quiz_def.md`.
- [src/common/games/README.md](src/common/games/README.md): game module conventions and registration workflow.

## Important files

- [src/firebase-init.ts](src/firebase-init.ts#L1-L80): Firebase initialization and emulator wiring.
- [src/common/database/firebase.adapter.ts](src/common/database/firebase.adapter.ts#L1-L140): database adapter used by models/controllers.
- [src/common/quiz/quiz.manager.ts](src/common/quiz/quiz.manager.ts#L1-L180): admin-side quiz lifecycle coordinator.

