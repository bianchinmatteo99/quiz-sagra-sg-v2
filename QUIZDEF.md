# Quiz definition format

Markdown format for quiz definitions.

The quiz file starts with a level-1 title, then an optional options block, then one or more level-2 game sections.
Each game section must use a registered game kind exactly as shown below.

## Complete sample file

```md
# My Quiz Title
start_time: 21:30

## Catena
title: Reazione a catena
time_for_answer: 20
points_for_correct_answer: 10
can_retry_for_same_word: true
words:
- first
- chain
- words

## Guess_song
title: Indovina la canzone
limit_trials_per_song: 2
stop_when_first_hand_raised: true
points_for_correct_answer: 100
correct_answers:
- Per Elisa
- Inno di Mameli
- Perfect

## Open_question
title: SFIDA FINALE
time_for_answer: 20
points_for_correct_answer: 60
questions_and_answers:
- Qual e la capitale d'Italia? = Roma
- In che anno è iniziata la Seconda Guerra Mondiale? = 1939
- Quale pianeta è conosciuto come Pianeta Rosso? = Marte

## Guess_word
title: Indovina la parola
stop_at_first_correct_answer: true
points_for_correct_answer: 50
delay_between_letter_display: 10
same_letters_policy: default
correct_answers:
- È meglio essere ottimisti ed avere torto piuttosto che pessimisti ed avere ragione.
- Precipitevolissimevolmente
- Alta tensione

## Numeric_estimation
title: Stima numerica di prova
time_for_question: 20
if_no_correct_answers: linear-decreasing-points
points_for_correct_answer: 25
questions_and_answers:
- Quanti minuti dura in media una partita di calcio regolamentare? = 90 minuti
- Quanti chilometri misura in media una maratona? = 42.195 km
- Quanti gradi Celsius sono 1 atmosfera di ebollizione dell'acqua? = 100 gradi

## QDCP
title: Quando Dove Come Perché
limit_trials_per_section: 2
stop_when_first_hand_raised: true
points_for_correct_answer: 40
hints_and_answers:
- Quando il tuo vicino sbadiglia | In aereo | Facendo facce strane | Perché vuole stapparle dopo ore di volo = Orecchie
- Quando fa la matta | Sul tavolo | In crisi d'identità | Perché a "7 e mezzo" può avere qualunque valore = Re di Denari

## Zip
title: Zip di prova
time_for_answer: 20
can_retry_for_same_zip: true
points_for_correct_answer: 30
zips:
- notte,stella,polare,freddo
- mare,onda,cresta,gallo
```

## Quiz options

Top-level options are written directly below the quiz title, before the first `## ...` section.

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `start_time` | string | - | No | Must be non-empty if provided |

#### `start_time`
Optional start time shown by the waiting screen and display UI. Use any non-empty string, typically a time like `21:30`.

## Game type: Catena

The `Catena` game type implements a word-chain word guessing game. Each game section starts with `## Catena` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Reazione a catena" | No | - |
| `time_for_answer` | number | 0 | No | Must be >= 0 |
| `points_for_correct_answer` | number | - | Yes | Must be >= 0 |
| `can_retry_for_same_word` | boolean | true | No | - |
| `words` | list of strings | - | Yes | At least one word required |

#### `title`
Display name for this game instance. Defaults to "Reazione a catena" if not provided.

#### `time_for_answer`
Time in seconds available for participants to provide each answer. Numeric value. Defaults to 0 if omitted. Must be non-negative.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Must be non-negative.

#### `can_retry_for_same_word`
Boolean flag controlling whether a participant can retry the same word after an incorrect answer. Accepts `true` or `false` (case-insensitive). Defaults to `true` if omitted.

#### `words`
List of chain words to play in order. Each word must be on its own line prefixed with `- `. Required property; at least one word must be provided.

## Game type: Guess_song

The `Guess_song` game type implements a song-guessing round. Each game section starts with `## Guess_song` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Indovina la canzone" | No | - |
| `limit_trials_per_song` | number | `Number.MAX_SAFE_INTEGER` | No | Must be > 0 |
| `stop_when_first_hand_raised` | boolean | false | No | - |
| `points_for_correct_answer` | number | - | Yes | Must be >= 0 |
| `correct_answers` | list of strings | - | Yes | At least one answer required |

#### `title`
Display name for this game instance. Defaults to "Indovina la canzone" if not provided.

#### `limit_trials_per_song`
Maximum number of answer attempts allowed per song before the round closes. Defaults to `Number.MAX_SAFE_INTEGER`, which is effectively unlimited for normal quiz use.

#### `stop_when_first_hand_raised`
Boolean flag controlling whether answer collection stops as soon as the first participant raises their hand. Defaults to `false` if omitted.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Must be non-negative.

#### `correct_answers`
Ordered list of correct answers, one entry per song in the playlist. Each answer must be on its own line prefixed with `- `. Required property; at least one answer must be provided.

## Game type: Open_question

The `Open_question` game type implements a question-and-answer round. Each game section starts with `## Open_question` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Domanda aperta" | No | - |
| `time_for_answer` | number | 0 | No | Must be >= 0 |
| `points_for_correct_answer` | number | - | Yes | Must be >= 0 |
| `questions_and_answers` | list of strings | - | Yes | At least one item required |

#### `title`
Display name for this game instance. Defaults to "Domanda aperta" if not provided.

#### `time_for_answer`
Time in seconds available for participants to submit an answer for each question. Defaults to `0`, which disables the timer and requires manual stop.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Must be non-negative.

#### `questions_and_answers`
List of entries in `question = answer` format. A trailing `?` in the question text is optional, and each list item must be on its own line prefixed with `- `. The parser splits each entry into matching question and answer arrays.

## Game type: Guess_word

The `Guess_word` game type implements a word-reveal guessing game. Each game section starts with `## Guess_word` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Indovina la parola" | No | - |
| `stop_at_first_correct_answer` | boolean | true | No | - |
| `points_for_correct_answer` | number | - | Yes | Must be >= 0 |
| `delay_between_letter_display` | number or false | false | No | Must be `false` or a number >= 0 |
| `same_letters_policy` | string | default | No | One of `separate`, `together`, `default` |
| `correct_answers` | list of strings | - | Yes | At least one answer required |

#### `title`
Display name for this game instance. Defaults to "Indovina la parola" if not provided.

#### `stop_at_first_correct_answer`
Boolean flag controlling whether answer collection stops after the first correct answer. Defaults to `true` if omitted.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Must be non-negative.

#### `delay_between_letter_display`
Automatic letter-reveal delay in seconds, or `false` to disable automatic progression. Defaults to `false` if omitted.

#### `same_letters_policy`
Policy for how repeated letters are revealed. Use `separate` to reveal repeated letters independently, `together` to reveal them together, or `default` to use the runtime default behavior (separate for single words, together for sentences).

#### `correct_answers`
Ordered list of accepted answers, one entry per round. Each answer must be on its own line prefixed with `- `. Required property; at least one answer must be provided.

## Game type: Numeric_estimation

The `Numeric_estimation` game type implements a numeric estimation round where participants provide estimated values and scoring can apply fallback policies when nobody matches exactly. Each game section starts with `## Numeric_estimation` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Stima numerica" | No | - |
| `time_for_question` | number | 0 | No | Must be >= 0 |
| `if_no_correct_answers` | string | "" | No | One of `""`, `half-points-to-closest`, `linear-decreasing-points` |
| `points_for_correct_answer` | number | - | Yes | Must be >= 0 |
| `questions_and_answers` | list of strings | - | Yes | At least one item required; each item must match `question = answer` |

#### `title`
Display name for this game instance. Defaults to "Stima numerica" if not provided.

#### `time_for_question`
Time in seconds available for participants to provide each answer. Numeric value. Defaults to 0 if omitted. Must be non-negative.

#### `if_no_correct_answers`
Fallback scoring policy applied when no participant gives an exactly correct answer. Defaults to an empty string (`""`), which means no fallback policy. Accepted values are:
- `""` no fallback policy.
- `half-points-to-closest` awards half points to the closest answer.
- `linear-decreasing-points` awards progressively lower points based on distance from the correct answer.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Must be non-negative.

#### `questions_and_answers`
List of entries in `question = answer` format. A trailing `?` in the question text is optional, and each list item must be on its own line prefixed with `- `. Answer must be numeric and can optionally include a unit at the end. Required property; at least one entry must be provided.

## Game type: QDCP

The `QDCP` game type implements a multi-hint guessing round. Each game section starts with `## QDCP` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Quando Dove Come Perché" | No | - |
| `limit_trials_per_section` | number | `Number.MAX_SAFE_INTEGER` | No | Must be > 0 |
| `stop_when_first_hand_raised` | boolean | false | No | - |
| `points_for_correct_answer` | number | - | Yes | Must be >= 0 |
| `hints_and_answers` | list of strings | - | Yes | At least one item required; each item must contain 5 parts |

#### `title`
Display name for this game instance. Defaults to "Quando Dove Come Perché" if not provided.

#### `limit_trials_per_section`
Maximum number of answer attempts allowed per section before the round closes. Defaults to `Number.MAX_SAFE_INTEGER`, which is effectively unlimited for normal quiz use.

#### `stop_when_first_hand_raised`
Boolean flag controlling whether answer collection stops as soon as the first participant raises their hand. Defaults to `false` if omitted.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Must be non-negative.

#### `hints_and_answers`
List of entries describing one section per line. Each entry is split on `|` or `=` and must contain exactly five non-empty parts. The runtime uses those parts as the hint chain plus the final answer.

## Game type: Zip

The `Zip` game type implements a comma-separated word-chain guessing game. Each game section starts with `## Zip` and contains the following properties:

### Properties

| Property | Type | Default | Required | Constraints |
|----------|------|---------|----------|-------------|
| `title` | string | "Zip" | No | - |
| `time_for_answer` | number | 0 | No | Must be >= 0 |
| `points_for_correct_answer` | number | - | Yes | Must be >= 0 |
| `can_retry_for_same_zip` | boolean | true | No | - |
| `zips` | list of string lists | - | Yes | At least one zip required; each item must have non-empty comma-separated words |

#### `title`
Display name for this game instance. Defaults to "Zip" if not provided.

#### `time_for_answer`
Time in seconds available for participants to provide each answer. Numeric value. Defaults to 0 if omitted. Must be non-negative.

#### `points_for_correct_answer`
Points awarded to each participant for a correct answer. Numeric value. Must be non-negative.

#### `can_retry_for_same_zip`
Boolean flag controlling whether a participant can retry the same zip after an incorrect answer. Defaults to `true` if omitted.

#### `zips`
List of zip chains to play in order. Each list item must contain one or more comma-separated words, and each word must be non-empty. Each zip must be on its own line prefixed with `- `.
