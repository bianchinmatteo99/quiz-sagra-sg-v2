import { IDatabaseAdapter } from "../database/database.types";
import { GameDefinition, GameManager, GameManagerContext } from "../games/game.base";
import { instantiateGameManagerFor } from "../games/games.register";
import { PeopleController, PeopleControllerContext } from "../people/people.controller";
import { QuizController, QuizControllerContext } from "./quiz.controller";
import { QuizStatus } from "./quiz.model";

class QuizManager implements QuizControllerContext, GameManagerContext, PeopleControllerContext {
    quiz: QuizController;
    activeGameManager: GameManager|null = null;
    people: PeopleController;
    db: IDatabaseAdapter;

    constructor(db: IDatabaseAdapter) {
        this.db = db;
        this.quiz = new QuizController(this);
        this.people = new PeopleController(this);
        console.log(this);
    }

    async boot(filename = "/quiz_def.md"): Promise<void> {
        const policy = await this.quiz.decideSourceAndLoad(filename);
        switch (policy) {
            case 'new':
                console.log("Loaded new quiz from file.");
                this.quiz.setStatus(QuizStatus.AwaitingStart);
                break;
            case 'restore':
                await this.restoreState();
                console.log("Restored quiz from database.");
                break;
            case 'error':
                console.error("Failed to load quiz from both sources.");
                break;
        }
    }

    async startGame(game: GameDefinition): Promise<void> {
        // TODO: Implement logic to start the game, e.g., navigate to the game page or initialize game state
        this.activeGameManager = instantiateGameManagerFor(game, this);
        this.activeGameManager.startGame();
    }

    getDatabase(): IDatabaseAdapter {
        return this.db;
    }

    async restoreState(): Promise<void> {
        // TODO: Restore local models to reflect database state
    }

    setGameTimelineDisplaysCurrent(boolean: boolean): void {}
    updateRanking(ranking: any): void {
        throw new Error("Method not implemented.");
    }
    notifyGameEnd(game: GameDefinition): void {
        throw new Error("Method not implemented.");
    }
}

export { QuizManager };

