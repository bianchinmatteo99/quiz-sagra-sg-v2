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
        while (this.controller.model.countRemainingWrongWords() > 0 && this.controller.model.countRemainingWrongWords()<this.controller.model.countAvailableWords()) {
            const availableWords = this.controller.model.getAvailableWords();
    
            let selectedIndex = -1;

            this.activeQuestion = new SelectQuestion(
                this,
                {
                    auto: (answer) => !this.controller.model.isWrongWord(answer),
                    manual: true,
                },
                {
                    stopWhen: StopWhenBuildersCollection.NumberOfSubmittedAnswersIs(1),
                },
                availableWords,
            );

            const result = await this.activeQuestion.ask({
                onAnswerClosed: (ans) => {
                    const selected = this.getFirstSubmittedAnswer(ans);
                    if (selected !== null) {
                        selectedIndex = this.controller.selectWord(selected);
                    }
                },
                beforeShowResults: async (res) => {
                    if (selectedIndex >= 0) {
                        this.controller.setSelectionCorrectness(selectedIndex);
                    }

                    const diff = this.buildRankingDiff(res);
                    if (diff.size > 0) {
                        setTimeout(() => this.context.updateRanking(diff), 1000);
                    }

                    return 3000;
                },
            });

            this.activeQuestion.clear();
            this.activeQuestion = null;
        }

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
