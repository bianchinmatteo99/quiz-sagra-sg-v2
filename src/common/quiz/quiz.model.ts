import { IDatabaseAdapter } from "../database/database.types";
import { BaseModel } from "../general.interfaces";
import { QuizDefinition } from "./quiz.definition";

enum QuizStatus {
    Booting, // Loading quiz definition and setting up the database
    AwaitingStart, // Waiting for the host to start the quiz
    OnBoarding, // Players are joining and setting up their profiles
    RunningGame, // A game is currently running
    Idle, // No game is running, but the quiz is active (e.g. between games)
    Ended, // The quiz has ended
}

interface QuizModelContext {
    getDatabase(): IDatabaseAdapter;
}

enum GameStatus {
    NotStarted,
    Disabled,
    InProgress,
    Completed,
}
    
class QuizModel extends BaseModel {
    readonly DBPATH = "/state/quiz";
    definition: QuizDefinition;
    status: QuizStatus;
    currentGame: number | null;
    gamesStatuses: GameStatus[];

    context: QuizModelContext;

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

    /* async loadFromDatabase(): Promise<boolean> {
        // Load quiz definition from the database and initialize state
        try {
            const data = await this.context.getDatabase().get<any>(QuizModel.DBPATH);
            if (data) {
                return this.parseFromJSON(data);
            }
        } catch (error) {
            console.error('Error loading quiz from database:', error);
        }
        return false;
    }

    async saveToDatabase(): Promise<void> {
        // Save the current quiz state to the database
        try {
            await this.context.getDatabase().set(QuizModel.DBPATH, this.toJSON());
        } catch (error) {
            console.error('Error saving quiz to database:', error);
        }
    }
 */
    parseFromJSON(data: any): boolean {
        // Parse quiz definition from JSON data
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

    toJSON(): any {
        // Convert quiz state to JSON for saving to the database
        return {
            gamesStatuses: this.gamesStatuses,
            status: this.status,
            currentGame: this.currentGame,
        };
    }
}

export { QuizModel, QuizStatus, GameStatus };
export type { QuizModelContext };
