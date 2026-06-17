import { getDatabase } from "firebase/database";
import { GameStatus, QuizDefinition, QuizModel, QuizModelContext, QuizStatus } from "./quiz.model";
import { QuizView, QuizViewContext } from "./quiz.view";
import { IDatabaseAdapter } from "../database/database.types.old";
import { Game } from "../games/game.base";

interface QuizControllerContext {
    getDatabase(): IDatabaseAdapter;
    startGame(game: Game): void;
}

class QuizController implements QuizViewContext, QuizModelContext {
    model: QuizModel;
    view: QuizView;
    context: QuizControllerContext;

    constructor(context: QuizControllerContext) {
        this.context = context;
        this.model = new QuizModel(this, QuizDefinition.placeholder());
        this.view = new QuizView(this);
    }

    setStatus(status: QuizStatus): void {
        this.model.status = status;
        this.stateUpdated();
    }

    setGameStatus(gameIndex: number, status: GameStatus): void {
        if (gameIndex < 0 || gameIndex >= this.model.gamesStatuses.length) {
            console.error(`Invalid game index: ${gameIndex}`);
            return;
        }
        this.model.gamesStatuses[gameIndex] = status;
        this.stateUpdated();
    }

    startGame(gameIndex: number): void {
        if (gameIndex < 0 || gameIndex >= this.model.gamesStatuses.length) {
            console.error(`Invalid game index: ${gameIndex}`);
            return;
        }
        this.model.currentGame = gameIndex;
        this.model.gamesStatuses[gameIndex] = GameStatus.InProgress;
        this.stateUpdated();
        const gameToStart = this.model.definition.games[gameIndex];
        this.context.startGame(gameToStart);
    }

    async decideSourceAndLoad(filename: string): Promise<'new' | 'restore' | 'error'> {
        
        const [db, file] = await Promise.all([
            QuizDefinition.loadFromDatabase(this.context.getDatabase()),
            QuizDefinition.loadFromFile(filename)
        ]);

        // Show dialog with available options
        const choice = await this.view.showChoiceDialog(!!db, !!file);
        
        if (choice === 'file' && !!file) {
            // Load from file and delete database quiz
            this.context.getDatabase().remove("/");
            file.saveToDatabase(this.context.getDatabase());
            this.model = new QuizModel(this, file);
            return 'new';
        } else if (choice === 'database-restart' && !!db) {
            // Load from database and restart
            this.context.getDatabase().remove("/");
            db.saveToDatabase(this.context.getDatabase());
            this.model = new QuizModel(this, db);
            return 'new';
        } else if (choice === 'database-continue' && !!db) {
            // Load from database and continue as is
            this.model = new QuizModel(this, db, true);
            // TODO: Implement restore logic
            return 'restore';
        }
        return 'error';
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    stateUpdated(): void {
        this.model.saveToDatabase();
        this.view.render();
    }

}

export { QuizController }
export type { QuizControllerContext }