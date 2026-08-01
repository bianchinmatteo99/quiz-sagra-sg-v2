import { StopWhenBuildersCollection } from "../../questions/questions.admin.base";
import { ResumeCheckpoints } from "../../admin.utils";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { OpenQuestionGameDefinition } from "./open_question.admin.definition";
import { OpenQuestionGameController } from "./open_question.admin.mvc";
import { OpenQuestionState } from "./open_question.contracts";
import { startRepeatedRaiseHandFlow } from "../games.admin.utils";

export class OpenQuestionGameManager extends GameManager {
    controller: OpenQuestionGameController;

    constructor(ctx: GameManagerContext, def: OpenQuestionGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new OpenQuestionGameController(this, def);
    }

    async startGame(): Promise<boolean> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(OpenQuestionState.DISPLAYCOVER);
        }

        while (this.controller.nextQuestion()) {
            if (!await this.controller.adminInteraction({advanceBtn: "Avvia domanda", otherBtn: "Salta questa domanda"})) {
                continue;
            }

            this.controller.setState(OpenQuestionState.ASKINGQUESTION);

            const ender = {manual: true, ...(this.controller.model.stopWhenFirstHandIsRaised ? {stopWhen: StopWhenBuildersCollection.NumberOfSubmittedAnswersIs(1)} : {})};
            const {result} = await startRepeatedRaiseHandFlow(this, ender, {limitWrongTrials: this.controller.model.limitTrialsPerQuestion});

            await this.controller.adminInteraction({advanceBtn: "Mostra risposta"});
            this.controller.setState(OpenQuestionState.SHOWINGANSWER);

            this.context.updateRanking(new Map(result.entries().filter(([id, v]) => v).map(([id, v]) => [id, this.controller.model.pointsForCorrectAnswer])));

            await this.controller.adminInteraction({advanceBtn: "Continua"});
            this.controller.setState(OpenQuestionState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(OpenQuestionState.ENDING);
        return this.endGame();
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state == OpenQuestionState.ENDING) {
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
