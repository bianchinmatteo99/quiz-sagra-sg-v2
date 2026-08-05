import { QuizModel, QuizModelContext } from "./quiz.model";
import { GameStatus, QuizStatus } from "./quiz.contract";
import { QuizDefinition, QuizDefinitionBuilder } from "./quiz.definition";
import { QuizView, QuizViewContext, type ManualQuestionOptions } from "./quiz.view";
import { IDatabaseAdapter } from "../database/database.types";
import { AnyGameDefinition, GameView } from "../games/games.admin.base";
import { instantiateGameViewerFor } from "../games/games.admin.register";

/**
 * Context provided by the quiz manager to the quiz controller.
 */
export interface QuizControllerContext {
    getDatabase(): IDatabaseAdapter;
    startGame(game: AnyGameDefinition): Promise<void>;
    startManualQuestion(options: ManualQuestionOptions): Promise<void>;
    setGameTimelineDisplaysCurrent(isCurrent: boolean): void;
    endQuiz(): void;
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
        this.view.setEnableStartTimeChange(status === QuizStatus.AwaitingStart);
        this.view.setManualStartQuestion(status === QuizStatus.Idle || status === QuizStatus.RunningGame);
        this.view.setReopenUserRegistrationVisibility(status === QuizStatus.Idle || status === QuizStatus.RunningGame);
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

    setFinalRankState(display: number|null = null){
        this.model.finalrankstate = display;
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
        const gameToStart: AnyGameDefinition = this.model.definition.games[gameIndex]!; // TESTING V2 - LINE WAS         const gameToStart = this.model.definition.games[gameIndex]!;
        this.context.startGame(gameToStart);
        this.viewGame(gameIndex);
    }

    /**
     * Mark the currently running game as completed.
     */
    gameEnded(error: boolean = false) {
        const id = this.model.currentGame;
        if (id == null) {
            throw new Error("Ending non-started game");
        }
        this.model.currentGame = null;
        this.model.gamesStatuses[id] = error ? GameStatus.Error : GameStatus.Completed;
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
            this.gameViewer = instantiateGameViewerFor(this.model.definition.games[gameIndex]!);
            this.gameViewer.setIsDisplayingTimeline(true);
        }
    }

    /**
     * Decide whether to load the quiz from the example file, uploaded file,
     * database restart, or continue from database.
     * @param filename File path to the quiz definition markdown.
     */
    async decideSourceAndLoad(filename: string): Promise<'new' | 'restore' | 'error'> {
        const builder = new QuizDefinitionBuilder();
        const [db, exampleFile] = await Promise.all([
            builder.loadFromDatabase(this.context.getDatabase()),
            builder.loadFromFile(filename)
        ]);

        const choice = await this.view.showChoiceDialog(!!db, !!exampleFile);
        if (!choice) {
            return 'error';
        }

        if (choice.kind === 'uploaded-file') {
            const uploadedMarkdown = await choice.file.text();
            const uploadedDefinition = await builder.parseFromMD(uploadedMarkdown);
            if (!uploadedDefinition) {
                return 'error';
            }

            await this.context.getDatabase().remove("/");
            await uploadedDefinition.saveToDatabase(this.context.getDatabase());
            this.model = new QuizModel(this, uploadedDefinition);
            return 'new';
        }

        if (choice.kind === 'example-file' && !!exampleFile) {
            // Load from bundled example file and reset runtime state.
            await this.context.getDatabase().remove("/");
            await exampleFile.saveToDatabase(this.context.getDatabase());
            this.model = new QuizModel(this, exampleFile);
            return 'new';
        } else if (choice.kind === 'database-restart' && !!db) {
            // Load from database definition and restart runtime state.
            await this.context.getDatabase().remove("/");
            await db.saveToDatabase(this.context.getDatabase());
            this.model = new QuizModel(this, db);
            return 'new';
        } else if (choice.kind === 'database-continue' && !!db) {
            // Load database definition, then let QuizManager.restoreState() normalize runtime state.
            this.model = new QuizModel(this, db);
            return 'restore';
        }
        return 'error';
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    async startManualQuestion(options: ManualQuestionOptions): Promise<void> {
        this.model.displayRankOnIdle = false;
        this.stateUpdated();
        try {
            await this.context.startManualQuestion(options);
        } finally {
            this.model.displayRankOnIdle = options.showRankingOnIdle;
            this.stateUpdated();
        }
    }

    /**
     * Persist quiz state and refresh the view.
     * @param remote True when the update came from a remote source and should not be saved locally.
     */
    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        this.view.render();
    }

    endQuiz(): void {
        if(confirm("SEI SICURO DI VOLER TERMINARE ORA IL QUIZ?")){
            this.context.endQuiz();
        }
    }
}

export { QuizController }
