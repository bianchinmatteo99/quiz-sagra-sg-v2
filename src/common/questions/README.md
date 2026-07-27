# Questions folder guide

This folder contains the shared contracts, base classes, and user-page registry used to add a new question type to the quiz system.

The code in here is organized around one rule: from the admin/runtime perspective, every question is a text answer collection plus a specific evaluation method.

## What belongs here

- Shared question contracts and lifecycle abstractions in the root of this folder.
- One subfolder per question implementation.
- User-page registry files that map a question `name` to the concrete user UI provider.

## Recommended folder layout

Use a lowercase folder name for each question type, and keep file names aligned with that folder name.

```text
src/common/questions/
  question.contract.ts
  questions.admin.base.ts
  questions.admin.timer.ts
  questions.user.base.ts
  questions.user.register.ts
  <question-name>/
    <question-name>.question.admin.ts
    <question-name>.question.user.ts
```

## Shared files

The shared files in this folder keep question implementations consistent:

- `question.contract.ts` defines lifecycle state and persisted snapshot shapes for question answers/results.
- `questions.admin.base.ts` contains the shared admin runtime: model, view, evaluation flow, and `Question.ask()` lifecycle.
- `questions.admin.timer.ts` provides timer behavior used by stop criteria.
- `questions.user.base.ts` contains the user-side page provider abstraction and default pages for non-answer states.
- `questions.user.register.ts` maps persisted question `name` values to concrete user page providers.

New question code should live in its own subfolder and avoid leaking question-specific logic into the shared base files.

## Core architecture notes

### Admin/runtime model

From the game-manager and admin perspective, a question type is not a different data shape.
It is always:

- one text answer per participant,
- one evaluation strategy (auto exact match, predicate, manual, or combinations),
- one stop policy for the ASKING phase (timer/manual/custom predicate).

So extending a question type usually does not mean changing answer transport or lifecycle contracts.
It mostly means choosing how evaluation is configured and how users input their text answer.

### Main extension goal

The main purpose of creating a new question type is to provide a user interface for answer submission.

In practice:

- the admin-side `Question` subclass is typically a thin wrapper over the shared base behavior,
- the user-side `QuestionUserPageProvider` and page implementation are where most differentiation happens.

### Instantiation model

Questions are directly instantiated by game managers.

There is no admin-side question registry in this folder: each game manager imports and constructs the question class it needs (for example `new TextInputQuestion(...)`).

The only question registry here is user-side (`questions.user.register.ts`), used to choose the correct user page provider from persisted `/state/question.name`.

## Required question-specific files

For each new question folder, implement these files and keep responsibilities isolated.

### `<question-name>.question.admin.ts`

- Implement one `QuestionModel` subclass with a stable `name` and `displayName`.
- Implement one `Question` subclass that creates the model and forwards evaluator/stop criteria to the base class.
- Keep this file runtime-focused: lifecycle orchestration and evaluation configuration, not user DOM rendering.

### `<question-name>.question.user.ts`

- Implement one `QuestionUserPageProvider` subclass.
- Override `whenAnswerEnabled(...)` to return the interactive page for this question type.
- Add a page class (usually extending `UserQuestionPage`) to render inputs and call `onAnswer(answer)` once.
- Keep setup/denied/evaluation/result pages inherited from `questions.user.base.ts` unless custom UX is needed.

## Step-by-step: adding a new question type

### 1. Choose a stable question name

Pick a lowercase `name` string (for example `text-input`, `numeric-input`, `multi-field-input`).
This `name` is persisted in `/state/question` and used by the user-page registry.

### 2. Create the question folder and files

Add:

- `<question-name>.question.admin.ts`
- `<question-name>.question.user.ts`

Keep admin/runtime and user-UI concerns separated.

### 3. Implement the admin/runtime class

In `<question-name>.question.admin.ts`:

- define the model `name` and `displayName`,
- subclass `Question` and initialize the model in the constructor,
- rely on `questions.admin.base.ts` for answer collection and evaluation flow.

If your type still evaluates text answers (which is the standard model), do not duplicate base lifecycle logic.

### 4. Implement the user answer UI

In `<question-name>.question.user.ts`:

- build the submission page DOM,
- collect user input,
- call `onAnswer(...)` with the final text payload.

This is the main extension point and should carry the distinguishing UX of the question type.

### 5. Register user page provider

Update `questions.user.register.ts` with a new `case` for the new `name` and return your provider.

If this step is missing, users cannot render the answer page even if admin runtime works.

### 6. Instantiate from game manager

In the relevant game manager (for example under `src/common/games/<game>/`):

- import your new question class,
- instantiate it directly where the game asks a question,
- pass evaluator and stop criteria suited for that game phase.

Question construction belongs to game flow orchestration, not to a central question admin registry.

## Example mental model

Think of a new question type as two layers:

- a shared admin/runtime layer that already knows how to ask, collect text answers, evaluate, and publish results,
- a custom user-input layer that decides how participants compose and submit that answer.

That separation keeps question behavior predictable for game managers while allowing rich, type-specific UX for users.
