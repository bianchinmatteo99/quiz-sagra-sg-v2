**Architecture overview**

High-level components
- **Entry points**: each deployment surface (user, admin, display) is a small single-page app that wires shared modules:
  - `src/index.ts` (User) — participant UI bootstrap and state observers ([src/index.ts](src/index.ts#L1-L40)).
  - `src/admin/index.ts` (Admin) — quiz host UI and the `QuizManager` bootstrap ([src/admin/index.ts](src/admin/index.ts#L1-L40)).
  - `src/display/index.ts` (Display) — presentation UI ([src/display/index.ts](src/display/index.ts#L1-L40)).

- **Common/shared** (`src/common/`) — contains core logic reused by all entry points:
  - `database/` — `firebase.adapter.ts` implements `IDatabaseAdapter` used throughout the app ([src/common/database/firebase.adapter.ts](src/common/database/firebase.adapter.ts#L1-L120)).
  - `quiz/` — quiz lifecycle, definitions, controller and manager (`QuizController`, `QuizManager`) ([src/common/quiz/quiz.manager.ts](src/common/quiz/quiz.manager.ts#L1-L200)).
  - `games/` — game definitions, managers, and viewers; new games register in `games.register.ts` ([src/common/games/games.register.ts](src/common/games/games.register.ts#L1-L120)).
  - `questions/` — question models, views and registration for user page providers (`questions.register.ts`).
  - `people/` — participant list and ranking manager (`PeopleModel`, `PeopleController`).

Design and data flow
- The app is serverless and uses the Firebase Realtime Database as the single source of truth. Admin actions write to the DB; other apps listen and react. This keeps client logic thin and avoids a central server.
- Most models expose a `DBPATH` and `toJSON()/parseFromJSON()` so they can save/restore state to/from the DB (`QuizModel.DBPATH = /state/quiz`). See `src/common/quiz/quiz.model.ts` ([src/common/quiz/quiz.model.ts](src/common/quiz/quiz.model.ts#L1-L80)).
- The `FirebaseDatabaseAdapter` centralizes reads/writes (`get`, `onValue`, `set`, `update`, `remove`). Use it in tests or to swap DB implementations.

Lifecycle (simplified)
1. Admin starts app → `QuizManager.boot()` loads quiz definition either from `public/quiz_def.md` or database.
2. Admin starts registration → `PeopleController.allowNewUsers(true)` opens onboarding and writes `/people` state.
3. Admin starts a game → `QuizManager.startGame()` instantiates a `GameManager` via `games.register` and runs the game's flow.
4. Questions are asked via `Question.ask()` which coordinates answer collection (`/results/answers`) and evaluation (`/results/evaluation`).

Extension points
- Add a new game: implement definition/manager/view under `src/common/games/` and register it in `games.register.ts`.
- Add a new question UI/provider: implement under `src/common/questions/` and register in `questions.register.ts`.

Concurrency and security notes
- The app relies on optimistic client interactions and DB listeners; time-critical coordination is handled by the host (admin).

Where to look first when changing behaviour
- UI changes: the relevant entry folder (admin, display, user).
- Business logic: `src/common/quiz/`, `src/common/games/`, `src/common/questions/`, `src/common/people/`.
- DB interactions: `src/common/database/firebase.adapter.ts` and `src/firebase-init.ts`.

**Current limitations / notes**
- **State restoration:** `QuizManager.restoreState()` is declared but not implemented; restoring a running quiz from the database is a pending task and will affect cold-start restore behavior.

