import { BaseModel, BaseModelContext } from "../general.utils";
import { QuizDefinition } from "./quiz.definition";

/**
 * Represents the lifecycle state of the quiz as a whole.
 */
enum QuizStatus {
    Booting, // Loading quiz definition and setting up the database
    AwaitingStart, // Waiting for the host to start the quiz
    OnBoarding, // Players are joining and setting up their profiles
    RunningGame, // A game is currently running
    Idle, // No game is running, but the quiz is active (e.g. between games)
    Ended, // The quiz has ended
}

/**
 * Marker interface for quiz model context data.
 * Extends the shared base model context contract.
 */
interface QuizModelContext extends BaseModelContext {
}

/**
 * Represents the status of an individual game within the quiz.
 */
enum GameStatus {
    NotStarted,
    Disabled, /* DEPRECATED */
    InProgress,
    Completed,
}
    
/**
 * Maintains the current quiz state and exposes serialization helpers.
 */
class QuizModel extends BaseModel {
    readonly DBPATH = "/state/quiz";
    definition: QuizDefinition;
    status: QuizStatus;
    currentGame: number | null;
    gamesStatuses: GameStatus[];

    context: QuizModelContext;

    /**
     * Create a new quiz model instance.
     * @param ctx Context information required by the base model.
     * @param def Loaded quiz definition containing games.
     * @param restoreState When true, attempts to load persisted state from the database.
     */
    constructor(ctx: QuizModelContext, def: QuizDefinition, restoreState: boolean = false) {
        super();
        this.definition = def;
        this.gamesStatuses = [...Array(def.games.length).fill(GameStatus.NotStarted)];
        this.status = QuizStatus.Booting;
        this.currentGame = null;
        this.context = ctx;
        if (restoreState) {
            // Load state from database if needed
            this.loadFromDatabase();
        }
    }

    /**
     * Update the model from raw JSON state.
     * @param data Serialized quiz state data.
     * @returns True when parsing succeeds, false on error.
     */
    parseFromJSON(data: any): boolean {
        try {
            this.gamesStatuses = data.gamesStatuses ?? [...Array(this.definition.games.length).fill(GameStatus.NotStarted)];
            this.status = data.status ?? QuizStatus.Booting;
            this.currentGame = data.currentGame ?? null;
            return true;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return false;
        }
    }

    /**
     * Serialize the current quiz state for persistence.
     * @returns JSON-compatible state object.
     */
    toJSON(): any {
        return {
            gamesStatuses: this.gamesStatuses,
            status: this.status,
            currentGame: this.currentGame,
        };
    }
}

export { QuizModel, QuizStatus, GameStatus };
export type { QuizModelContext };
