import { ResumeCheckpoints } from "../../admin.utils";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { OpenQuestionGameDefinition } from "./open_question.admin.definition";
import { OpenQuestionGameController } from "./open_question.admin.mvc";
import { OpenQuestionState } from "./open_question.contracts";
import { TextInputQuestion } from "../../questions/text_input/text_input.question.admin";

export class OpenQuestionGameManager extends GameManager {
    controller: OpenQuestionGameController;

    constructor(ctx: GameManagerContext, def: OpenQuestionGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new OpenQuestionGameController(this, def);
    }

    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(OpenQuestionState.DISPLAYCOVER);
        }

        while (this.controller.nextQuestion()) {
            if (!await this.controller.adminInteraction({advanceBtn: "Avvia domanda", otherBtn: "Salta questa domanda"})) {
                continue;
            }

            this.controller.setState(OpenQuestionState.ASKINGQUESTION);

            const answer = this.controller.model.getCurrentAnswer();
            if (!answer) {
                throw new Error("Open question is missing a correct answer for the current round.");
            }
            
            this.activeQuestion = new TextInputQuestion(
                this,
                { auto: answer, manual: true },
                {
                    manual: true,
                    ...(this.controller.model.timeForAnswer > 0 ? { timer: this.controller.model.timeForAnswer } : {}),
                },
            );
            await this.activeQuestion.ask({
                beforeShowResults: async (res) => {
                    this.controller.setState(OpenQuestionState.SHOWINGANSWER);
                    setTimeout(() => {
                        this.context.updateRanking(new Map(res.entries().filter(([id, v]) => v).map(([id, v]) => [id, this.controller.model.pointsForCorrectAnswer])));
                    }, 1000);
                    return 4000;
                }
            });
            
            await this.controller.adminInteraction({advanceBtn: "Continua"});
            this.activeQuestion.clear();
            this.activeQuestion = null;
            this.controller.setState(OpenQuestionState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(OpenQuestionState.ENDING);
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
