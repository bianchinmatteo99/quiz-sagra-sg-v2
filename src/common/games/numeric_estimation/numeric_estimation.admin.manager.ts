import { Ender } from "../../questions/questions.admin.base";
import { ResumeCheckpoints } from "../../admin.utils";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { NumericEstimationGameDefinition } from "./numeric_estimation.admin.definition";
import { NumericEstimationGameController } from "./numeric_estimation.admin.mvc";
import { NumericEstimationState } from "./numeric_estimation.contracts";
import { TextInputQuestion } from "../../questions/text_input/text_input.question.admin";
import { RankingDiff } from "../../people/people.controller";

export class NumericEstimationGameManager extends GameManager {
    controller: NumericEstimationGameController;

    constructor(ctx: GameManagerContext, def: NumericEstimationGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new NumericEstimationGameController(this, def);
    }

    private numericDistance(x:number|null,y:number|null){
        if(x===null || y===null || Number.isNaN(x) || Number.isNaN(y)){
            return Number.POSITIVE_INFINITY;
        }
        return Math.abs(x-y)
    }

    private parseSubmittedNumber(answer: string): number | null {
        const match = answer.match(/^\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))/);
        if (!match) {
            return null;
        }

        const parsed = Number.parseFloat(match[1]!.replace(",", "."));
        return Number.isNaN(parsed) ? null : parsed;
    }

    private computeScoringDiff(
        res: any,
        ans: any,
        correctAnswer: number | null,
        policy: "" | "half-points-to-closest" | "linear-decreasing-points",
        pointsForCorrectAnswer: number,
    ): RankingDiff {
        const diff: RankingDiff = new Map();
        const resultEntries = res.entries().toArray() as Array<[string, boolean]>;
        const correct = resultEntries.filter((entry) => entry[1]).map((entry) => entry[0]);

        if (correct.length > 0) {
            correct.forEach((id) => diff.set(id, pointsForCorrectAnswer));
            return diff;
        }

        const answerEntries = ans.entries().toArray() as Array<[string, { answer: string }]>;
        const distances: Array<[string, number]> = answerEntries.map((entry) => [
            entry[0],
            this.numericDistance(this.parseSubmittedNumber(entry[1].answer), correctAnswer),
        ]);

        const finiteDistances = distances.filter(([_, d]) => Number.isFinite(d));

        if (policy === "half-points-to-closest") {
            if (finiteDistances.length === 0) {
                return diff;
            }

            // Deterministic tie-breaking: shortest distance, then lexicographically smallest player id.
            const [closestId] = finiteDistances.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]!;
            diff.set(closestId, pointsForCorrectAnswer / 2);
            return diff;
        }

        if (policy === "linear-decreasing-points") {
            if (correctAnswer === null) {
                return diff;
            }

            const denominator = Math.max(Math.abs(correctAnswer), 1);
            finiteDistances.forEach(([id, distance]) => {
                const relativeDistance = distance / denominator;
                const rawScore = (1 - relativeDistance) * pointsForCorrectAnswer;
                const score = Math.max(0, Math.min(pointsForCorrectAnswer, rawScore));
                diff.set(id, score);
            });
        }

        return diff;
    }

    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(NumericEstimationState.DISPLAYCOVER);
        }

        while (this.controller.nextQuestion()) {
            if (!await this.controller.adminInteraction({advanceBtn: "Avvia domanda", otherBtn: "Salta questa domanda"})) {
                continue;
            }

            this.controller.setState(NumericEstimationState.ASKINGQUESTION);
            const corrans = this.controller.model.getNumericAnswerAndUnit()?.[0] ?? null;
            const ender : Ender = {manual: true, ...(this.controller.model.timeForQuestion>0 ? {timer: this.controller.model.timeForQuestion} : {})};
            this.activeQuestion = new TextInputQuestion(this, {
                manual: true,
                auto: (answer) => this.numericDistance(this.parseSubmittedNumber(answer), corrans) < Math.sqrt(Number.EPSILON)
            }, ender);

            await this.activeQuestion.ask({
                beforeShowResults: async (res, ans) => {
                    const diff = this.computeScoringDiff(
                        res,
                        ans,
                        corrans,
                        this.controller.model.ifNoCorrectAnswers,
                        this.controller.model.pointsForCorrectAnswer,
                    );
                    
                    this.controller.setState(NumericEstimationState.SHOWINGANSWER);
                    setTimeout(() => {
                        this.context.updateRanking(diff);
                    }, 1000);
                    return 4000;
                },
            });
      
            await this.controller.adminInteraction({advanceBtn: "Continua"});
            this.activeQuestion.clear();
            this.activeQuestion = null;
            this.controller.setState(NumericEstimationState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(NumericEstimationState.ENDING);
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state == NumericEstimationState.ENDING) {
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
