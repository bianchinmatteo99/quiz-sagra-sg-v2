import { ResumeCheckpoints } from "../../admin.utils";
import { StopWhenBuildersCollection } from "../../questions/questions.admin.base";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { startRepeatedRaiseHandFlow } from "../games.admin.utils";
import { QDCPGameDefinition } from "./qdcp.admin.definition";
import { QDCPGameController } from "./qdcp.admin.mvc";
import { QDCPState } from "./qdcp.contracts";

export class QDCPGameManager extends GameManager {
    controller: QDCPGameController;

    constructor(ctx: GameManagerContext, def: QDCPGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new QDCPGameController(this, def);
    }

    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(QDCPState.DISPLAYCOVER);
        }

        while (this.controller.nextEntry()) {
            if (!await this.controller.adminInteraction({ advanceBtn: "Inizia questa domanda", otherBtn: "Salta questa domanda" })) {
                continue;
            }

            this.controller.setState(QDCPState.ASKINGQUESTION);

            const ender = {
                manual: true,
                ...(this.controller.model.stopWhenFirstHandIsRaised
                    ? { stopWhen: StopWhenBuildersCollection.NumberOfSubmittedAnswersIs(1) }
                    : {}),
            };

            let hasCorrect = false;
            while (this.controller.nextHintSection()) {
                const { result } = await startRepeatedRaiseHandFlow(this, ender, {limitWrongTrials: this.controller.model.limitTrialsPerSection});
                const correct = [...result.values()].some((value) => value);

                if (correct) {
                    hasCorrect = true;
                    await this.controller.displayCorrectWord();
                    this.context.updateRanking(new Map([...result.entries()]
                        .filter(([, ok]) => ok)
                        .map(([id]) => [id, this.controller.model.pointsForCorrectAnswer])));
                    break;
                }
            }
            if(!hasCorrect){
                await this.controller.displayCorrectWord();
            }

            
            await this.controller.adminInteraction({ advanceBtn: "Concludi domanda"})
            this.controller.setState(QDCPState.DISPLAYCOVER);
            
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(QDCPState.ENDING);
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state == QDCPState.ENDING) {
                    return false;
                }
                this.controller.model.currentSection = 0;

                endResume();
                return true;
            },
            "end-phase": (endResume) => {
                endResume();
                return true;
            },
        });
    }
}