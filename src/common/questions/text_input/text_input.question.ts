import { Ender, Evaluator, Question, QuestionContext, QuestionModel, QuestionResult } from "../question.base";


class TextInputQuestionModel extends QuestionModel{
    readonly name = "text-input";
    readonly displayName = "Risposta testuale";
}

export class TextInputQuestion extends Question {
    
    readonly model : TextInputQuestionModel;

    constructor(ctx: QuestionContext, evaluate: Evaluator, stopAnswersCriteria: Ender, deny: string[]=[]){
        super(ctx, evaluate, stopAnswersCriteria);
        this.model = new TextInputQuestionModel(this, deny);
    }

}