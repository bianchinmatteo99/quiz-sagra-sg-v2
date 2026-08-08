import { ResumeCheckpoints } from "../../admin.utils";
import { SelectQuestion } from "../../questions/select/select.question.admin";
import { QuestionAnswers, QuestionResult } from "../../questions/question.contract";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { ScossaGameDefinition } from "./scossa.admin.definition";
import { ScossaGameController } from "./scossa.admin.mvc";
import { ScossaState } from "./scossa.contracts";
import { StopWhenBuildersCollection } from "../../questions/questions.admin.base";

export class ScossaGameManager extends GameManager {
    controller: ScossaGameController;

    constructor(ctx: GameManagerContext, def: ScossaGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new ScossaGameController(this, def);
    }

    private getFirstSubmittedAnswer(ans: QuestionAnswers): string | null {
        return ans.values().next().value?.answer ?? null;
    }

    private buildRankingDiff(result: QuestionResult): Map<string, number> {
        const correctPoints = this.controller.model.pointsForCorrectAnswer;
        const lostPoints = this.controller.model.pointsLostForWrongAnswer;

        return new Map(Array.from(result.entries()).map(([id, isCorrect]) => [
            id,
            isCorrect ? correctPoints : -lostPoints,
        ]));
    }

    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(ScossaState.DISPLAYCOVER);
            await this.controller.adminInteraction({advanceBtn: "Inizia"});
        }

        this.controller.setState(ScossaState.ASKINGQUESTION);
        

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(ScossaState.ENDING);
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state === ScossaState.ENDING) {
                    return false;
                }

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
