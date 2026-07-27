import { BaseModel, BaseModelContext } from "../general.utils";
import { QuizDefinition } from "./quiz.definition";
import { QuizStateSnapshot } from "./quiz.contract";
import { GameStatus, QuizStatus } from "./quiz.contract";

/**
 * Marker interface for quiz model context data.
 * Extends the shared base model context contract.
 */
interface QuizModelContext extends BaseModelContext {
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
    finalrankstate: number|null = null;
    displayRankOnIdle: boolean = true;

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
    parseFromJSON(data: Partial<QuizStateSnapshot> | null | undefined): boolean {
        try {
            this.gamesStatuses = data?.gamesStatuses ?? [...Array(this.definition.games.length).fill(GameStatus.NotStarted)];
            this.status = data?.status ?? QuizStatus.Booting;
            this.currentGame = data?.currentGame ?? null;
            this.finalrankstate = data?.finalrankstate ?? null;
            this.displayRankOnIdle = data?.displayRankOnIdle ?? true;
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
    toJSON(): QuizStateSnapshot {
        return {
            gamesStatuses: this.gamesStatuses,
            status: this.status,
            currentGame: this.currentGame,
            finalrankstate: this.finalrankstate,
            displayRankOnIdle: this.displayRankOnIdle,
        };
    }
}

export { QuizModel };
export type { QuizModelContext };
