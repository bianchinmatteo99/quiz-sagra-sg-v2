import { CancelHandle } from "../general.utils";
import { QuestionState } from "../questions/question.types";
import { GameStatus, QuizStatus } from "../quiz/quiz.types";

/**
 * Shared shape used by the quiz app's Firebase Realtime Database.
 *
 * The schema is intentionally modeled as a single root object for the
 * general application state, while omitting game-specific and question-specific
 * payloads that are stored under the shared state and results branches.
 */
export type PersonRecord = {
    id?: string;
    name: string;
    rank?: {
        points: number;
        lastupdate: number;
        position: number;
        lastpos: number;
    };
};

export interface RealtimeDatabaseRoot {
    /** Quiz definition persisted at /definition. */
    definition?: {
        title: string;
        games: unknown[];
    };

    /** General application state persisted at /state. */
    state?: {
        /** Shared quiz lifecycle state at /state/quiz. */
        quiz: {
            status: QuizStatus;
            currentGame: number | null;
            gamesStatuses: GameStatus[];
            finalrankstate: number | null;
            displayRankOnIdle: boolean;
        };

        /** General runtime game state at /state/game. */
        game?: {
            kind: string;
            name: string;
            title?: string;
        };

        /** General runtime question state at /state/question. */
        question?: {
            name: string;
            state: QuestionState;
            deny?: string[];
            enableAnswers?: boolean;
            enableManualEvaluation?: boolean;
        };

        /** Shared countdown end timestamp at /state/timerend. */
        timerend?: number | null;

        /** Presentation-only state at /state/display. */
        display?: {
            rankingupto?: number | null;
        };
    };

    /** Participant onboarding and ranking data at /people. */
    people?: {
        allowOnboarding: boolean;
        list?: Record<string, PersonRecord>;
    };

    /** Question answers and evaluation results at /results. */
    results?: {
        answers?: Record<string, {
            time: string;
            answer: string;
        }>;
        evaluation?: Record<string, boolean>;
    };
}

/**
 * Abstract database contract used to decouple application logic from
 * specific database implementations.
 */
export function createMockState(): RealtimeDatabaseRoot {
    return {
        state: {
            quiz: {
                status: QuizStatus.Booting,
                currentGame: null,
                gamesStatuses: [],
                finalrankstate: null,
                displayRankOnIdle: true,
            }
        },
    };
}

export interface IDatabaseAdapter {
    /**
     * Reads a value from the database at the given path.
     * @param path - The database path to read from.
     * @returns The value at the path, or null when no data exists.
     */
    get<T>(path: string): Promise<T | null>;

    /**
     * Subscribes to value changes at the given path.
     * @param path - The database path to observe.
     * @param callback - Receives the latest value or null when data is missing.
     * @returns A cancel handle that removes the listener when invoked.
     */
    onValue<T>(path: string, callback: (value: T | null) => void): CancelHandle;

    /**
     * Writes a value to the specified database path.
     * @param path - The database path to write to.
     * @param value - The payload to store.
     */
    set<T>(path: string, value: T): Promise<void>;

    /**
     * Updates an existing object at the given path using a partial payload.
     * @param path - The database path to update.
     * @param value - Partial object containing updated properties.
     */
    update<T>(path: string, value: Partial<T>): Promise<void>;

    /**
     * Removes the value at the specified database path.
     * @param path - The database path to delete.
     */
    remove(path: string): Promise<void>;
}

