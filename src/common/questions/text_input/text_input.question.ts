import { EventPage, UserQuestionPage } from "../../../user/user.base.views";
import { QuestionUserPageProvider } from "../../../user/user.decisiontree";
import { StateHandler } from "../../../user/user.state";
import { CancelHandle } from "../../general.utils";
import { Ender, Evaluator, Question, QuestionContext, QuestionModel } from "../question.base";


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

class UserTextInputPage extends UserQuestionPage {
    attachListeners(): CancelHandle[] {
        const input = this.container?.getElementsByTagName("input")[0] as HTMLInputElement;
        const button = this.container?.getElementsByTagName("button")[0] as HTMLButtonElement;
        return [this.attachListenerTo(button, "click", ()=>{
            this.onAnswer(input.value);
        })];
    }
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
        <span>La vostra risposta:</span>
        <input />
        <button>Invia</button>
        `;
    }
}

export class TextInputQuestionPageProvider extends QuestionUserPageProvider {
    whenAnswerEnabled(state: StateHandler, onAnswer: (answer: string) => void): EventPage {
        return new UserTextInputPage(onAnswer);
    }
}