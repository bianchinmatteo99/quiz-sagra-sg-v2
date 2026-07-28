# Quiz definition format

Markdown format for quiz definitions loaded by [src/common/quiz/quiz.definition.ts](src/common/quiz/quiz.definition.ts).
Quiz definitions are read from [public/quiz_def.md](public/quiz_def.md) or restored from the database.
Game parsers are registered in [src/common/games/games.admin.register.ts](src/common/games/games.admin.register.ts).

## Complete sample file

```md
# My Quiz Title

## Catena
title: Reazione a Catena
time_for_answer: 20
points_for_correct_answer: 10
can_retry_for_same_word: true
words:
- first
- chain
- words

## Other game
...

```

## Game type: Catena

The `Catena` game type implements a word-chain word guessing game. Each game section starts with `## Catena` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Reazione a catena" | No | - |
| `time_for_answer` | number | 0 | No | Must be >= 0 |
| `points_for_correct_answer` | number | 10 | No | Must be >= 0 |
| `can_retry_for_same_word` | boolean | true | No | - |
| `words` | list of strings | - | Yes | At least one word required |

#### `title`
Display name for this game instance. Defaults to "Reazione a catena" if not provided.

#### `time_for_answer`
Time in seconds available for participants to provide each answer. Numeric value. Defaults to 0 if omitted. Must be non-negative.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Defaults to 10 if omitted. Must be non-negative.

#### `can_retry_for_same_word`
Boolean flag controlling whether a participant can retry the same word after an incorrect answer. Accepts `true` or `false` (case-insensitive). Defaults to `true` if omitted.

#### `words`
List of chain words to play in order. Each word must be on its own line prefixed with `- `. Required property; at least one word must be provided.
