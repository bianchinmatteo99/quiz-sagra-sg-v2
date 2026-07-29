import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";

/**
 * Lifecycle states of the Guess Song game, progressing from setup through
 * reveal and teardown.
 *
 * The admin game manager drives transitions between these states and writes
 * the current value into the game state snapshot persisted at `/state/game`.
 */
export enum GuessSongState {
    /** Game has been started but no content is visible to participants yet. */
    STARTING,
    /** The song cover (or any visual hint) is being shown. */
    DISPLAYCOVER,
    /** Participants can submit their answer for the current song. */
    ASKINGQUESTION,
    /** The correct answer is revealed to all clients. */
    SHOWINGANSWER,
    /** Game is wrapping up; results are finalised. */
    ENDING,
}

/**
 * Identity token for the Guess Song game type.
 *
 * Used as the discriminant when registering and resolving the game across
 * the admin, display, and presenter registries.
 */
export const GuessSongGameRequiredData = {kind: "guess_song", name: "Indovina la canzone"} as const satisfies GameRequiredData

/**
 * Persisted configuration for a Guess Song game instance.
 *
 * Stored under `/definition` in the Firebase Realtime Database as part of the
 * quiz definition and loaded by the admin manager at game start.
 */
export interface GuessSongGameDefinitionData extends GameDefinitionData<typeof GuessSongGameRequiredData> {
    /** Maximum number of answer attempts allowed per song before the round closes. */
    limitTrialsPerSong: number;
    /**
     * When `true`, answer collection stops as soon as the first participant
     * raises their hand, regardless of `limitTrialsPerSong`.
     */
    stopWhenFirstHandRaised: boolean;
    /**
     * Ordered list of correct answers, one entry per song in the playlist.
     * The entry at index `i` is the expected answer for song `i`.
     */
    correctAnswers: string[];
    /** Points awarded to each participant who answers the current song correctly. */
    pointsForCorrectAnswer: number;
}

/**
 * Runtime state snapshot for the Guess Song game, written to `/state/game`
 * in the Firebase Realtime Database and consumed by the display and presenter
 * views.
 *
 * Fields mirroring the definition are included so that display and presenter
 * clients can render the current round without needing to read `/definition`.
 */
export interface GuessSongGameStateSnapshot extends GameStateSnapshotBase<typeof GuessSongGameRequiredData> {
    /** Current lifecycle state of the game. */
    state: GuessSongState;
    /** Zero-based index of the song currently being played/guessed. */
    currentSongIndex: number;
    /** Correct answer string for the current song, shown during {@link GuessSongState.SHOWINGANSWER}. */
    displayCorrectAnswer: string;

    /** Mirrors {@link GuessSongGameDefinitionData.limitTrialsPerSong} for display clients. */
    limitTrialsPerSong: number;
    /** Mirrors {@link GuessSongGameDefinitionData.stopWhenFirstHandRaised} for display clients. */
    stopWhenFirstHandIsRaised: boolean;
    /** Mirrors {@link GuessSongGameDefinitionData.pointsForCorrectAnswer} for display clients. */
    pointsForCorrectAnswer: number;
}