import { Ender, StopWhenBuildersCollection } from "../../questions/questions.admin.base";
import { ResumeCheckpoints } from "../../admin.utils";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { NumericEstimationGameDefinition } from "./numeric_estimation.admin.definition";
import { NumericEstimationGameController } from "./numeric_estimation.admin.mvc";
import { NumericEstimationState } from "./numeric_estimation.contracts";
import { startRepeatedRaiseHandFlow } from "../games.admin.utils";
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
            this.activeQuestion = new TextInputQuestion(this, {manual: true, auto: (answer)=>this.numericDistance(Number.parseFloat(answer), corrans)<Math.sqrt(Number.EPSILON)}, ender);

            await this.activeQuestion.ask({
                beforeShowResults: async (res, ans) => {
                    const correct = res.entries().filter(([id, v]) => v).map(([id, v]) => id).toArray();
                    const diff : RankingDiff = new Map();
                    if(correct.length>0){
                        correct.forEach((id)=>diff.set(id, this.controller.model.pointsForCorrectAnswer))
                    } else if(this.controller.model.ifNoCorrectAnswers==="half-points-to-closest"){
                        const closest = ans.entries().toArray().map<[string,number]>((a)=>[a[0], this.numericDistance(Number.parseFloat(a[1].answer), corrans)]).sort((a,b)=>b[1]-a[1]).pop()?.[0];
                        if(closest){
                            diff.set(closest, this.controller.model.pointsForCorrectAnswer/2)
                        }
                    } else if(this.controller.model.ifNoCorrectAnswers==="linear-decreasing-points"){
                        const relativeDistance = ans.entries().toArray().map<[string,number]>((a)=>[a[0], this.numericDistance(Number.parseFloat(a[1].answer), corrans)/(corrans??1)])
                        relativeDistance.forEach(([id,d])=>diff.set(id,Math.max(0, (1-d)*this.controller.model.pointsForCorrectAnswer)))
                    }
                    
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
