import { GameStatus, QuizModel, QuizModelContext, QuizStatus } from "./quiz.model";
import { QuizDefinition, QuizDefinitionBuilder } from "./quiz.definition";
import { QuizView, QuizViewContext } from "./quiz.view";
import { IDatabaseAdapter } from "../database/database.types";
import { GameDefinition, GameView } from "../games/game.base";
import { instantiateGameViewerFor } from "../games/games.register";

/**
 * Context provided by the quiz manager to the quiz controller.
 */
interface QuizControllerContext {
    getDatabase(): IDatabaseAdapter;
    startGame(game: GameDefinition): Promise<void>;
    setGameTimelineDisplaysCurrent(boolean: boolean): void;
}

/**
 * Controls quiz state transitions and user interactions.
 */
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

    /**
     * Update the quiz lifecycle status.
     * @param status New quiz status.
     */
    setStatus(status: QuizStatus): void {
        this.model.status = status;
        this.stateUpdated();
    }

    /**
     * Set the status for an individual game.
     * @param gameIndex Index of the game to update.
     * @param status New game status.
     */
    setGameStatus(gameIndex: number, status: GameStatus): void {
        if (gameIndex < 0 || gameIndex >= this.model.gamesStatuses.length) {
            console.error(`Invalid game index: ${gameIndex}`);
            return;
        }
        this.model.gamesStatuses[gameIndex] = status;
        this.stateUpdated();
    }

    /**
     * Begin executing a game and update the model accordingly.
     * @param gameIndex Index of the game to start.
     */
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

    /**
     * Mark the currently running game as completed.
     */
    gameEnded() {
        const id = this.model.currentGame;
        if (id == null) {
            throw new Error("Ending non-started game");
        }
        this.model.currentGame = null;
        this.model.gamesStatuses[id] = GameStatus.Completed;
        this.stateUpdated();
    }

    /**
     * Display an advance button for an administrative step and wait for operator confirmation.
     *
     * This method renders a button in the quiz UI with the provided label and returns only
     * after the administrator clicks it. It is intended for sequential quiz flow control,
     * such as pausing before starting onboarding, ending registration, or showing final rankings.
     *
     * @param text Button label displayed to the administrator.
     * @returns Promise that resolves when the admin clicks the rendered advance button.
     */
    async adminInteraction(text: string): Promise<void> {
        return new Promise((resolve) => {
            this.view.renderAdvanceButton(text, resolve);
        });
    }

    /**
     * Show the timeline for the selected game or current active game.
     * @param gameIndex Index of the game to view.
     */
    viewGame(gameIndex: number): void {
        if (gameIndex < 0 || gameIndex >= this.model.gamesStatuses.length) {
            console.error(`Invalid game index: ${gameIndex}`);
            return;
        }
        if (!!this.gameViewer) {
            this.gameViewer.setIsDisplayingTimeline(false);
            this.gameViewer = null;
        }
        if (gameIndex == this.model.currentGame) {
            this.context.setGameTimelineDisplaysCurrent(true);
        } else {
            this.context.setGameTimelineDisplaysCurrent(false);
            this.gameViewer = instantiateGameViewerFor(this.model.definition.games[gameIndex]);
            this.gameViewer.setIsDisplayingTimeline(true);
        }
    }

    /**
     * Decide whether to load the quiz from file, database restart, or continue from database.
     * @param filename File path to the quiz definition markdown.
     */
    async decideSourceAndLoad(filename: string): Promise<'new' | 'restore' | 'error'> {
        const builder = new QuizDefinitionBuilder();
        const [db, file] = await Promise.all([
            builder.loadFromDatabase(this.context.getDatabase()),
            builder.loadFromFile(filename)
        ]);

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

    /**
     * Persist quiz state and refresh the view.
     * @param remote True when the update came from a remote source and should not be saved locally.
     */
    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        this.view.render();
    }
}

export { QuizController }
export type { QuizControllerContext }