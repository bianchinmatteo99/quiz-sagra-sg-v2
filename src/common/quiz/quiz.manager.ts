import { IDatabaseAdapter } from "../database/database.types";
import { AnyGameDefinition, GameManager, GameManagerContext } from "../games/games.admin.base";
import { instantiateGameManagerFor } from "../games/games.admin.register";
import { PeopleController, PeopleControllerContext, RankingDiff } from "../people/people.controller";
import { Person } from "../people/people.model";
import { QuizController, QuizControllerContext } from "./quiz.controller";
import { GameStatus, QuizStatus } from "./quiz.contract";

/**
 * Coordinates quiz lifecycle, game execution, and player management.
 */
class QuizManager implements QuizControllerContext, GameManagerContext, PeopleControllerContext {
    quiz: QuizController;
    activeGameManager: GameManager | null = null;
    people: PeopleController | null = null;
    db: IDatabaseAdapter;

    constructor(db: IDatabaseAdapter) {
        this.db = db;
        this.quiz = new QuizController(this);
        console.log(this);
    }

    /**
     * Initialize the quiz from the selected source and create the people controller.
     * @param filename File path to the quiz definition markdown.
     */
    async boot(filename = "/quiz_def.md"): Promise<void> {
        const policy = await this.quiz.decideSourceAndLoad(filename);
        switch (policy) {
            case 'new':
                console.log("Loaded quiz definition and reset runtime state.");
                this.quiz.setStatus(QuizStatus.AwaitingStart);
                break;
            case 'restore':
                await this.restoreState();
                console.log("Restored quiz from database.");
                break;
            case 'error':
                console.error("Failed to load quiz from any sources.");
                break;
        }
        this.people = new PeopleController(this);
    }

    /**
     * Start the onboarding phase and allow new users to register.
     */
    async start(): Promise<void> {
        if (this.quiz.model.status != QuizStatus.AwaitingStart) throw new Error("New user registration not allowed");
        await this.quiz.adminInteraction("Inizio registrazione utenti");
        this.people?.model.allowNewUsers(true);
        this.quiz.setStatus(QuizStatus.OnBoarding);
        await this.quiz.adminInteraction("Fine registrazione utenti");
        this.people?.model.allowNewUsers(false);
        this.quiz.setStatus(QuizStatus.Idle);
    }

    /**
     * Start a game and update quiz state after completion.
     * @param game Game definition to execute.
     */
    async startGame(game: AnyGameDefinition): Promise<void> {
        this.activeGameManager = instantiateGameManagerFor(game, this);
        this.quiz.setStatus(QuizStatus.RunningGame);
        const shouldDisplayRanking = await this.activeGameManager.startGame();
        this.quiz.gameEnded();
        if (this.quiz.model.gamesStatuses.some((g) => g == GameStatus.NotStarted)) {
            this.quiz.model.displayRankOnIdle = shouldDisplayRanking;
            this.quiz.setStatus(QuizStatus.Idle);
        } else {
            this.endQuiz();
        }
    }

    /**
     * End the quiz and transition to the final state.
     */
    async endQuiz(): Promise<void> {
        this.quiz.setStatus(QuizStatus.FinalRanking);
        await this.quiz.adminInteraction("Mostra TERZO classificato");
        this.quiz.setFinalRankState(3);
        await this.quiz.adminInteraction("Mostra SECONDO classificato");
        this.quiz.setFinalRankState(2);
        await this.quiz.adminInteraction("Mostra PRIMO classificato");
        this.quiz.setFinalRankState(1);
        await this.quiz.adminInteraction("Mostra intera classifica");
        this.quiz.setFinalRankState(0);
        await this.quiz.adminInteraction("Concludi");
        this.quiz.setStatus(QuizStatus.Ended);
    }

    getDatabase(): IDatabaseAdapter {
        return this.db;
    }

    /**
     * Restore runtime models from persisted database state.
     * Implementation is currently pending.
     */
    async restoreState(): Promise<void> {
        // TODO: Restore local models to reflect database state
    }

    /**
     * Control whether the currently active game timeline is displayed.
     * @param bool True to display the current game timeline, false otherwise.
     */
    setGameTimelineDisplaysCurrent(bool: boolean): void {
        if (!this.activeGameManager) return;
        this.activeGameManager.controller.view.setIsDisplayingTimeline(bool);
    }

    /**
     * Forward ranking updates to the people controller.
     * @param diff Ranking changes to apply.
     */
    updateRanking(diff: RankingDiff): void {
        this.people?.updateRanking(diff);
    }

    /**
     * Retrieve the current player list.
     * @returns Map of player IDs to person instances.
     */
    getPeopleList(): Map<string, Person> {
        return this.people?.getPeopleList() ?? new Map();
    }
}

export { QuizManager };

