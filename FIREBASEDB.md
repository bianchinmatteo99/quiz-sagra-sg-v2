Firebase Realtime Database design

This file documents the database keys and the expected shapes used across the codebase.

Top-level keys and purpose
- `/definition`
  - Stores the quiz definition (title and array of games). Written/read by `QuizDefinition` ([src/common/quiz/quiz.definition.ts](src/common/quiz/quiz.definition.ts#L1-L120)).
  - Example:

    {
      "title": "My Quiz",
      "games": [ { "name": "catena", "...": "..." }, ... ]
    }

- `/state` — ephemeral application state used to coordinate displays and the quiz lifecycle. Subkeys usually written/read by various models' `DBPATH` values.
  - `/state/quiz` — quiz controller state (status, currentGame, gamesStatuses) (`QuizModel`).
    Example:

    {
      "status": 2,
      "currentGame": null,
      "gamesStatuses": [0,1,2]
    }

  - `/state/game` — current/archived game model state (used by `GameModel` implementations).

  - `/state/question` — current question metadata and flags managed by `QuestionModel`.
    Example (partial):

    {
      "name": "text-input",
      "state": 1,
      "deny": [],
      "enableAnswers": true,
      "enableManualEvaluation": false
    }

  - `/state/timerend` — timer push used by `Timer` (numeric end timestamp or -1 when cleared).

- `/results` — stores per-question answers and evaluation
  - `/results/answers/{userId}` — set by participants when answering (object: { time, answer }). Example:

    {
      "uid123": { "time": "2026-07-06T12:00:00.000Z", "answer": "42" },
      "uid456": { "time": "2026-07-06T12:00:05.000Z", "answer": "24" }
    }

  - `/results/evaluation/{userId}` — evaluation/results written by question/game controllers (boolean per participant). Display and user code read this to show correct/incorrect.

- `/people` — participant onboarding, list and ranking (managed by `PeopleModel`, DBPATH = `/people`). The model writes a JSON object with `allowOnboarding` and `list`.
  - Example:

    {
      "allowOnboarding": true,
      "list": {
        "uid123": { "id": "uid123", "name": "Alice", "rank": { "points": 10, "lastupdate": 12345, "position": 1 } },
        "uid456": { "id": "uid456", "name": "Bob", "rank": { "points": 5, "lastupdate": 12300, "position": 2 } }
      }
    }

- `/secrets{SECRETSPATH}` — optional secret storage created by models that set `SECRETSPATH`. Example from `GameModel` (`SECRETSPATH = "/game"`) results in `/secrets/game/{key}` storing secret values.

Other conventions
- The client code uses a few canonical access paths in helpers/view/state handlers:
  - App state root: `/state` (read by user/display entrypoints).
  - Person path prefix: `/people/list/{id}` (user registration and person listener in `UserStateHandler`).
  - Answers path: `/results/answers/{userId}` (set by participant clients).
  - Results path: `/results/evaluation/{userId}` (read by participants/display, written by admin/game controllers).

Security and rules (current)
- The repository's `database.rules.json` now enforces the following rules:
  - Root `.read` and `.write` are restricted to a single hardcoded admin UID: `ZPqIdKqf0yZxWkZzpbzmCvBmmlt2`.
  - `/state` is publicly readable (`.read: true`). This allows displays and participant clients to observe quiz/app state.
  - `/people/list/$uid` is readable only by the authenticated user with id equal to `$uid`. Writing the `name` field under that path is allowed only to the same `$uid`.
  - `/results/answers/$uid` may be written only by the authenticated user matching `$uid` (participants write their own answers).
  - `/results/evaluation/$uid` is readable only by the authenticated user matching `$uid` (individual evaluation visibility).

Notes and implications
- The admin UID is hardcoded in the rules file — TODO committing production admin UIDs or rotate to a more robust role-based rule (e.g. check `auth.token.admin == true`).
- Because `/state` is readable by anyone, presentation clients can render quizzes without additional auth, but control actions remain restricted to the admin UID.

Emulator
- `src/firebase-init.ts` supports emulator mode when `VITE_USE_FIREBASE_EMULATOR=true` (connects to local auth and database emulators). See [src/firebase-init.ts](src/firebase-init.ts#L1-L40).


