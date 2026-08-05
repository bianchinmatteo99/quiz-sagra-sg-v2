import { IDatabaseAdapter } from "../../database/database.types";
import { Person } from "../../people/people.model";
import { RankingDiff } from "../../people/people.controller";
import { Question, QuestionContext } from "../../questions/questions.admin.base";
import { ResumeCheckpoints } from "../../admin.utils";
import { AnyFieldsObject } from "./base.admin.contracts";
import { GameController, GameControllerContext } from "./base.admin.controller";

/** Services exposed by the quiz host layer to concrete game managers. */
export interface GameManagerContext {
    /** Shared database adapter accessor. */
    getDatabase(): IDatabaseAdapter;
    /** Apply score deltas to current ranking. */
    updateRanking(diff: RankingDiff): void;
    /** Retrieve current participants map. */
    getPeopleList(): Map<string, Person>;
}

/**
 * Base runtime orchestrator for one game execution.
 *
 * Concrete managers implement the game loop in startGame and provide resume
 * checkpoint wiring for state restoration.
 */
export abstract class GameManager implements GameControllerContext, QuestionContext {
    /** Host-level services from quiz manager. */
    context: GameManagerContext;
    /** Resume-checkpoint registry for restoring interrupted sessions. */
    resumeCheckpoints: ResumeCheckpoints;
    /** Currently active question instance, when one is running. */
    activeQuestion: Question | null = null;
    /** Concrete game controller implementation for this manager. */
    abstract controller: GameController<AnyFieldsObject>;

    constructor(ctx: GameManagerContext, restoreState: boolean) {
        this.context = ctx;
        this.resumeCheckpoints = restoreState ? this.buildResumeCheckpoints() : new ResumeCheckpoints();
    }

    /** Access the shared database adapter. */
    getDatabase(): IDatabaseAdapter { return this.context.getDatabase(); }

    /** Access current participants. */
    getPeopleList(): Map<string, Person> { return this.context.getPeopleList(); }

    /** Execute the concrete game flow. */
    abstract startGame(): Promise<void>;

    /**
     * Execute full game lifecycle: start flow, then finalization prompt, then cleanup.
     */
    async runGame(): Promise<boolean> {
        try {
            await this.startGame();
            return await this.endGame();
        } finally {
            try {
                this.controller.clearAll();
                this.activeQuestion?.clear();
            } catch (e) {
                console.log("Error during game cleanup.");
                console.error(e);
            }
        }
    }

    /**
     * Ask final admin choice after game completion.
     *
     * Returns true when ranking should be shown next.
     */
    async endGame(): Promise<boolean> {
        return await this.controller.adminInteraction({ advanceBtn: "Mostra classifica", otherBtn: "Passa a un altro gioco" });
    }

    /** Build checkpoints used by restore mode to continue an interrupted game flow. */
    abstract buildResumeCheckpoints(): ResumeCheckpoints;
}