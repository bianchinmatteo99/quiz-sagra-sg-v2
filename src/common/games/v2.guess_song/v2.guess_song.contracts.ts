import { defineFields, definition, GameDbDataFromFields, GameDefinitionDataFromFields, GameModelDataFromFields, model, Parsers, required, ValidationError } from "../v2.base/base.admin.contracts";

/** Runtime lifecycle states for the Guess Song game flow. */
export enum GuessSongState {
    /** Initial state before the first song is started. */
    STARTING,
    /** Song/cover is being introduced to players. */
    DISPLAYCOVER,
    /** Participants can submit guesses for the current song. */
    ASKINGQUESTION,
    /** Correct answer is visible and scoring has been resolved. */
    SHOWINGANSWER,
    /** Terminal state once all songs are completed. */
    ENDING,
}

/**
 * Field schema for Guess Song definitions and runtime state.
 *
 * Includes static configuration parsed from definition markdown and mutable
 * model fields persisted under /state/game.
 */
export const guessSongFields = defineFields({
    ...required("guess_song", "Indovina la canzone"),

    limitTrialsPerSong: definition({
        visibility: "public",
        mdkey: "limit_trials_per_song",
        parser: Parsers.number,
        default: Number.MAX_SAFE_INTEGER,
        validator: (unsafe) => unsafe > 0 ? null : new ValidationError("limit_trials_per_song must be > 0"),
        views: { showin: "both", descr: "Numero di tentativi per ogni canzone", translate: (v) => v === Number.MAX_SAFE_INTEGER ? "infiniti" : String(v) }
    }),

    stopWhenFirstHandIsRaised: definition({
        visibility: "public",
        mdkey: "stop_when_first_hand_raised",
        parser: Parsers.boolean,
        default: false,
        views: { showin: "both", descr: "Blocca le risposte", translate: (v) => v ? "alla prima prenotazione" : "manuale" }
    }),

    correctAnswers: definition({
        visibility: "private",
        mdkey: "correct_answers",
        parser: Parsers.getListParserFor(Parsers.string)
    }),

    pointsForCorrectAnswer: definition({
        visibility: "public",
        mdkey: "points_for_correct_answer",
        parser: Parsers.number,
        validator: (unsafe) => unsafe >= 0 ? null : new ValidationError("points_for_correct_answer must be >= 0"),
        views: { showin: "both", descr: "Punti per ogni risposta corretta" }
    }),

    state: model({
        visibility: "public",
        default: GuessSongState.STARTING
    }),

    currentSongIndex: model({
        visibility: "public",
        default: -1
    }),

    displayCorrectAnswer: model({
        visibility: "public",
        default: ""
    }),
} as const);

/** Fully parsed game definition payload for Guess Song. */
export type GuessSongDefinitionData = GameDefinitionDataFromFields<typeof guessSongFields>;
/** In-memory model payload for Guess Song runtime state. */
export type GuessSongModelData = GameModelDataFromFields<typeof guessSongFields>;
/** Persisted database payload for Guess Song runtime state. */
export type GuessSongDbData = GameDbDataFromFields<typeof guessSongFields>;