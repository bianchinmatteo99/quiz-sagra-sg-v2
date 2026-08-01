import { IDatabaseAdapter } from "../database/database.types";
import { AnyGameDefinition, GameManager, GameManagerContext } from "../games/games.admin.base";
import { instantiateGameManagerFor } from "../games/games.admin.register";
import { PeopleController, PeopleControllerContext, RankingDiff } from "../people/people.controller";
import { Person } from "../people/people.model";
import { QuizController, QuizControllerContext } from "./quiz.controller";
import { GameStatus, QuizStatus } from "./quiz.contract";
import { ResumeCheckpoints } from "../admin.utils";
import { delay } from "../general.utils";
import { TextInputQuestion } from "../questions/text_input/text_input.question.admin";
import { RaiseHandQuestion } from "../questions/raise_hand/raise_hand.question.admin";
import { Ender } from "../questions/questions.admin.base";
import type { ManualQuestionOptions } from "./quiz.view";

/**
 * Coordinates quiz lifecycle, game execution, and player management.
 */
class QuizManager implements QuizControllerContext, GameManagerContext, PeopleControllerContext {
    quiz: QuizController;
    activeGameManager: GameManager | null = null;
    people: PeopleController | null = null;
    db: IDatabaseAdapter;
    private manualQuestionRunning = false;

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
        this.people = new PeopleController(this);
        switch (policy) {
            case 'new':
                console.log("Loaded quiz definition and reset runtime state.");
                this.quiz.setStatus(QuizStatus.AwaitingStart);
                break;
            case 'restore':
                await this.restoreState();
                console.log("Restoring quiz from database.");
                break;
            case 'error':
                console.error("Failed to load quiz from any sources.");
                break;
        }
    }

    /**
     * Start the onboarding phase and allow new users to register.
     */
    async start(): Promise<void> {
        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            if (this.quiz.model.status != QuizStatus.AwaitingStart) throw new Error("New user registration not allowed");
            await this.quiz.adminInteraction("Inizio registrazione utenti");
            this.people?.model.allowNewUsers(true);
            this.quiz.setStatus(QuizStatus.OnBoarding);
            await this.quiz.adminInteraction("Fine registrazione utenti");
            this.people?.model.allowNewUsers(false);
            this.quiz.setStatus(QuizStatus.Idle);
        }
        
        this.resumeCheckpoints.reachedCheckPoint("idle-phase")
    }

    /**
     * Start a game and update quiz state after completion.
     * @param game Game definition to execute.
     */
    async startGame(game: AnyGameDefinition): Promise<void> {
        this.activeGameManager = instantiateGameManagerFor(game, this, !this.resumeCheckpoints.reachedCheckPoint("starting-game"));
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

    async startManualQuestion(options: ManualQuestionOptions): Promise<void> {
        if (this.manualQuestionRunning) {
            throw new Error("A manual question is already running.");
        }

        this.manualQuestionRunning = true;
        document.getElementById("question-container")?.classList.add("severe");
        const ender: Ender = {
            manual: true,
            ...(options.timer !== undefined ? { timer: options.timer } : {}),
        };

        const question = options.kind === "raise-hand"
            ? new RaiseHandQuestion(this, ender)
            : new TextInputQuestion(this, {
                ...(options.autoCorrectAnswer !== undefined ? { auto: options.autoCorrectAnswer } : {}),
                manual: true,
            }, ender);

        try {
            await question.ask({
                beforeShowResults: async () => {
                    if (options.displayResultsTime === undefined) {
                        return true;
                    }
                    return options.displayResultsTime;
                },
                beforeEnd: async (res) => {
                    const points = options.pointsForCorrectAnswer ?? 0;
                    if (points === 0) {
                        return;
                    }

                    const diff: RankingDiff = new Map(
                        [...res.entries()]
                            .filter(([, isCorrect]) => isCorrect)
                            .map(([id]) => [id, points]),
                    );

                    if (diff.size > 0) {
                        this.updateRanking(diff);
                    }
                },
            });
        } finally {
            question.clear();
            document.getElementById("question-container")?.classList.remove("severe");
            this.manualQuestionRunning = false;
        }
    }


    resumeCheckpoints = new ResumeCheckpoints()
    /**
     * Restore runtime models from persisted database state.
     * The restore policy is conservative:
     * - people/ranking are fully restored,
     * - question/game transient runtime branches are cleared,
     * - quiz status is aligned to a safe checkpoint.
     */
    async restoreState(): Promise<void> {
        const db = this.getDatabase();
        await Promise.all([
            db.remove("/state/question"),
            db.remove("/state/timerend"),
            db.remove("/results/"),
        ]);

        this.resumeCheckpoints = new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if([QuizStatus.Booting, QuizStatus.AwaitingStart, QuizStatus.OnBoarding].includes(this.quiz.model.status)){
                    endResume();
                    return true;
                }
                if(this.quiz.model.status==QuizStatus.Ended){
                    endResume();
                    return false;
                }
                return false;
            },
            "idle-phase": (endResume) => {
                const s = this.quiz.model.status;
                if(s==QuizStatus.FinalRanking){
                    endResume();
                    this.endQuiz();
                }
                if(s==QuizStatus.RunningGame){
                    if(this.quiz.model.currentGame !== null && confirm("Provare a riavviare il gioco in corso?")){
                        this.quiz.startGame(this.quiz.model.currentGame)
                    } else {
                        this.quiz.model.gamesStatuses = this.quiz.model.gamesStatuses.map((st)=>(st===GameStatus.Completed?GameStatus.Completed:GameStatus.NotStarted));
                        db.remove("/state/game");
                        this.quiz.setStatus(QuizStatus.Idle);
                    }
                }
                if(s==QuizStatus.Idle){
                    endResume();
                }
                return false;
            },
            "starting-game": (endResume) => {
                endResume();
                return false; // if this checkpoint is activated it means that previous once did not call endResume()
            }
        });
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

