import { StopWhenBuildersCollection } from "../../questions/questions.admin.base";
import { ResumeCheckpoints } from "../../admin.utils";
import { startRepeatedRaiseHandFlow } from "../games.admin.utils";
import { GameManager, GameManagerContext } from "../v2.base/base.admin.manager";
import { GuessSongState } from "./v2.guess_song.contracts";
import { GuessSongGameDefinition } from "./v2.guess_song.admin.definition";
import { GuessSongGameController } from "./v2.guess_song.admin.controller";

/** Runtime orchestrator for the Guess Song game flow. */
export class GuessSongGameManager extends GameManager {
    /** Controller instance managing Guess Song state and rendering. */
    controller: GuessSongGameController;

    /** Create a manager bound to host context and concrete game definition. */
    constructor(ctx: GameManagerContext, def: GuessSongGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new GuessSongGameController(this, def);
    }

    /**
     * Execute the full Guess Song loop:
     * initialize state, iterate songs, run raise-hand rounds, and update ranking.
     */
    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(GuessSongState.DISPLAYCOVER);
        }

        while (this.controller.nextSong()) {
            if (!await this.controller.adminInteraction({ advanceBtn: "Avvia la canzone", otherBtn: "Salta questa canzone" })) {
                continue;
            }

            this.controller.setState(GuessSongState.ASKINGQUESTION);

            const ender = { manual: true, ...(this.controller.model.stopWhenFirstHandIsRaised ? { stopWhen: StopWhenBuildersCollection.NumberOfSubmittedAnswersIs(1) } : {}) };
            const { result } = await startRepeatedRaiseHandFlow(this as any, ender, { limitWrongTrials: this.controller.model.limitTrialsPerSong });

            await this.controller.adminInteraction({ advanceBtn: "Mostra risposta" });
            this.controller.setState(GuessSongState.SHOWINGANSWER);

            this.context.updateRanking(new Map(result.entries().filter(([id, v]) => v).map(([id]) => [id, this.controller.model.pointsForCorrectAnswer])));

            await this.controller.adminInteraction({ advanceBtn: "Continua" });
            this.controller.setState(GuessSongState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(GuessSongState.ENDING);
    }

    /** Build restore checkpoints used when resuming an interrupted game session. */
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