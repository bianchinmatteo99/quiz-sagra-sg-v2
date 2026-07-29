import { Ender, Evaluator, Question, QuestionContext, QuestionModel } from "../questions.admin.base";

class RaiseHandQuestionModel extends QuestionModel{
    /** Registry identifier persisted in `/state/question.kind`. */
    readonly kind = "raise-hand";
    /** Human-readable label shown in admin, display, and presenter views. */
    readonly name = "Alzata di mano";

    readonly RAISEHANDANSWER = "&#x270B;";
}

export class RaiseHandQuestion extends Question {
    
    readonly model : RaiseHandQuestionModel;

    
    constructor(ctx: QuestionContext, stopAnswersCriteria?: Ender, deny: string[]=[]){
        super(ctx, {manual: true}, stopAnswersCriteria ?? {manual: true});
        this.model = new RaiseHandQuestionModel(this, deny);
    }

}
