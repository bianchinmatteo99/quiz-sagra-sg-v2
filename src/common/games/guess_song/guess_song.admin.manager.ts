import { StopWhenBuildersCollection } from "../../questions/questions.admin.base";
import { ResumeCheckpoints } from "../../admin.utils";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { GuessSongGameDefinition } from "./guess_song.admin.definition";
import { GuessSongGameController } from "./guess_song.admin.mvc";
import { GuessSongState } from "./guess_song.contracts";
import { startRepeatedRaiseHandFlow } from "../games.admin.utils";

/**
 * Runtime orchestrator for a Guess Song game session.
 *
 * This boilerplate mirrors the Catena manager structure while keeping the
 * flow intentionally generic for the Guess Song game.
 */
export class GuessSongGameManager extends GameManager {
    /** Controller owning Guess Song model state and admin-facing rendering. */
    controller: GuessSongGameController;

    /**
     * Create a Guess Song manager bound to host-level game context.
     *
     * @param ctx Manager context provided by the quiz runtime.
     * @param def Parsed Guess Song game definition for this session.
     * @param restoreState When true, controller/model attempt state restoration.
     */
    constructor(ctx: GameManagerContext, def: GuessSongGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new GuessSongGameController(this, def);
    }

    /**
     * Execute the Guess Song game flow.
     */
    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(GuessSongState.DISPLAYCOVER);
        }

        while (this.controller.nextSong()) {
            if(! await this.controller.adminInteraction({advanceBtn: "Avvia la canzone", otherBtn: "Salta questa canzone"})){
                continue;
            }

            this.controller.setState(GuessSongState.ASKINGQUESTION);

            const ender = {manual: true, ...(this.controller.model.stopWhenFirstHandIsRaised ? {stopWhen: StopWhenBuildersCollection.NumberOfSubmittedAnswersIs(1)} : {})}
            const {result, trials} = await startRepeatedRaiseHandFlow(this, ender, {limitWrongTrials: this.controller.model.limitTrialsPerSong})
            
            await this.controller.adminInteraction({advanceBtn: "Mostra risposta"})
            this.controller.setState(GuessSongState.SHOWINGANSWER);

            this.context.updateRanking(new Map(result.entries().filter(([id, v]) => v).map(([id, v]) => [id, this.controller.model.pointsForCorrectAnswer])))

            await this.controller.adminInteraction({advanceBtn: "Continua"})
            this.controller.setState(GuessSongState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(GuessSongState.ENDING);
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state == GuessSongState.ENDING) {
                    return false;
                } else {
                    endResume();
                    return true;
                }
            },
            "end-phase": (endResume) => {
                endResume();
                return true;
            }
        });
    }
}
