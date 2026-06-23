import { getDatabase } from "firebase/database";
import { GameStatus, QuizModel, QuizModelContext, QuizStatus } from "./quiz.model";
import { QuizDefinition, QuizDefinitionBuilder } from "./quiz.definition";
import { QuizView, QuizViewContext } from "./quiz.view";
import { IDatabaseAdapter } from "../database/database.types.old";
import { GameDefinition, GameView } from "../games/game.base";
import { instantiateGameViewerFor } from "../games/games.register";

interface QuizControllerContext {
    getDatabase(): IDatabaseAdapter;
    startGame(game: GameDefinition): Promise<void>;
    setGameTimelineDisplaysCurrent(boolean: boolean): void;
}

class QuizController implements QuizViewContext, QuizModelContext {
    model: QuizModel;
    view: QuizView;
    context: QuizControllerContext;
    gameViewer: GameView | null = null;

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
        this.viewGame(gameIndex);
    }
    gameEnded(){
        const id = this.model.currentGame;
        if(id==null){
            throw new Error("Ending non-started game");
        }
        this.model.currentGame = null;
        this.model.gamesStatuses[id] = GameStatus.Completed;
        this.stateUpdated();
    }

    viewGame(gameIndex: number): void {
        if (gameIndex < 0 || gameIndex >= this.model.gamesStatuses.length) {
            console.error(`Invalid game index: ${gameIndex}`);
            return;
        }
        if(!!this.gameViewer){
            this.gameViewer.setIsDisplayingTimeline(false);
            this.gameViewer = null;
        }
        if(gameIndex==this.model.currentGame){
            this.context.setGameTimelineDisplaysCurrent(true);
        } else {
            this.context.setGameTimelineDisplaysCurrent(false);
            this.gameViewer = instantiateGameViewerFor(this.model.definition.games[gameIndex]);
            this.gameViewer.setIsDisplayingTimeline(true);
        }
    }

    async decideSourceAndLoad(filename: string): Promise<'new' | 'restore' | 'error'> {
        
        const builder = new QuizDefinitionBuilder();
        const [db, file] = await Promise.all([
            builder.loadFromDatabase(this.context.getDatabase()),
            builder.loadFromFile(filename)
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

    stateUpdated(remote : boolean = false): void {
        if(!remote) this.model.saveToDatabase();
        this.view.render();
    }

}

export { QuizController }
export type { QuizControllerContext }