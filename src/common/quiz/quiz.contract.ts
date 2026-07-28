import { GameDefinitionData } from "../games/games.contracts";

/**
 * Lifecycle states for the quiz as a whole.
 */
export enum QuizStatus {
    Booting, // Loading quiz definition and setting up the database
    AwaitingStart, // Waiting for the host to start the quiz
    OnBoarding, // Players are joining and setting up their profiles
    RunningGame, // A game is currently running
    Idle, // No game is running, but the quiz is active (e.g. between games)
    FinalRanking,
    Ended, // The quiz has ended
}

/**
 * Status of an individual game within the quiz.
 */
export enum GameStatus {
    NotStarted,
    InProgress,
    Completed,
}

/**
 * Persisted quiz definition payload stored under /definition.
 */
export interface QuizDefinitionSnapshot {
    /** Quiz title shown in the UI and admin tools. */
    title: string;
    /** Serialized game definitions included in this quiz. */
    games: GameDefinitionData[];
}

/**
 * Persisted quiz runtime state stored under /state/quiz.
 */
export interface QuizStateSnapshot {
    /** Current quiz lifecycle stage. */
    status: QuizStatus;
    /** Index of the currently active game, or null when none is active. */
    currentGame: number | null;
    /** Per-game status for each quiz game. */
    gamesStatuses: GameStatus[];
    /** Optional final ranking display state. */
    finalrankstate: number | null;
    /** Whether the ranking should be shown while the quiz is idle. */
    displayRankOnIdle: boolean;
}
