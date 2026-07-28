# Quiz definition format

This document describes the markdown format used by the quiz loader in [src/common/quiz/quiz.definition.ts](src/common/quiz/quiz.definition.ts) and the concrete game parsers registered in [src/common/games/games.admin.register.ts](src/common/games/games.admin.register.ts).

For game module conventions, file layout, and registration workflow, see [src/common/games/README.md](src/common/games/README.md).

The admin boot flow reads the quiz definition from [public/quiz_def.md](public/quiz_def.md) (served by the dev server at `/quiz_def.md`) or from the database when a saved definition exists, parses it into a quiz object, and then uses the parsed game definitions to start the quiz. The admin entrypoint calls the loader with the path `/quiz_def.md` by default.

## Parsing flow

1. The loader reads the markdown file as plain text.
2. It parses the markdown structure: first level-1 heading (`# ...`), optional key/value quiz options block, then game sections started by level-2 headings (`## ...`).
3. Each game section title selects a registered builder for that game type.
4. The section content (without the `## ...` line) is passed to the builder parser.
5. The builder parses the section content into a game definition object.
6. The resulting quiz definition is stored under the database path `/definition` and can later be restored from JSON.

## File structure

A quiz definition file is intentionally simple:

```md
# Quiz title

## GameType
key: value
another_key: value

## AnotherGameType
...
```

### Rules

- The first `# ` heading is treated as the quiz title.
- Optional quiz-level options can be placed between the `# ...` title and the first `## ...` section as `key: value` or `key:` + list items.
- Game sections start at `## ` headings.
- Blank lines are ignored.
- Section parsers trim and normalize values.
- The game type is normalized to lowercase and must match a registered builder key.
- Unknown game types cause the parser to fail.
- Unexpected heading levels and malformed key/list lines cause the parser to fail with meaningful errors.

## Supported game type

At the moment the only registered game type is `catena`.

### Catena section syntax

A Catena game section uses this shape:

```md
## Catena
time_for_answer: 30
points_for_correct_answer: 10
can_retry_for_same_word: False
words:
- catena
- di
- prova
```

Supported keys:

- `time_for_answer`: numeric value for the available answer time.
- `points_for_correct_answer`: numeric value for the score awarded for a correct answer. If missing, the parser defaults to `10`.
- `can_retry_for_same_word`: boolean-like value (`true`/`false`, case-insensitive). If missing, the parser defaults to `false`.
- `words`: followed by one bullet item per line, starting with `- `.



## Notes and limitations

- The markdown parser is intentionally lightweight; it does not support nested headings, YAML blocks, or complex formatting.
- Section parsing is strict: unexpected formats and unsupported keys in game content fail fast.
- The section order is preserved and becomes the game order in the quiz.
- The same format can also be restored from the database JSON representation of the quiz definition, where each game object includes a `name` field and its serialized settings.
- When adding a new game kind, keep this file focused on markdown authoring format and update game implementation details in [src/common/games/README.md](src/common/games/README.md).
