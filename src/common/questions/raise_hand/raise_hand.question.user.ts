import { UserQuestionPage } from "../../../user/user.views";
import { EventPage } from "../../navigation/pages";
import { UserStateHandler } from "../../../user/user.state";
import { CancelHandle } from "../../general.utils";
import { QuestionUserPageProvider } from "../questions.user.base";


class UserRaiseHandPage extends UserQuestionPage {
    /** Hides the standard header to keep focus on answer entry. */
    shouldDisplayHeader = false;
    /** Hides the standard footer for a compact submission layout. */
    shouldDisplayFooter = false;

    
    attachListeners(): CancelHandle[] {
        const button = this.container?.getElementsByTagName("button")[0] as HTMLButtonElement;
        return [this.attachListenerTo(button, "click", () => {
            this.onAnswer("&#x270B;");
        })];
    }

    
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
        <style>
        button#raiseHand {
            padding: 16px;
            border-radius: 50%;
            font-size: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            filter: none;
            box-shadow: 5px 10px 0 #003973;
            transition: transform .1s, box-shadow .1s;
        }

        button#raiseHand img {
            padding: 8px 16px 8px 0;
            width: 200px;
        }
        button#raiseHand:active {
            transform: translate(5px, 10px);
            box-shadow: 0 0 0 #003973;
        }
        </style>
        <span>Pronto a rispondere?</span>
        <button id="raiseHand"><img src="/img/hand.png" alt="Alza la mano"></button>
        `;
    }
}


export class RaiseHandQuestionPageProvider extends QuestionUserPageProvider {
    /**
     * Creates a page for the answer submission phase.
     * @param state User state handler (currently unused; part of the shared provider contract).
     * @param onAnswer Callback invoked when the user submits their text answer.
     * @returns A page displaying the text input form.
     */
    whenAnswerEnabled(state: UserStateHandler, onAnswer: (answer: string) => void): EventPage {
        return new UserRaiseHandPage(onAnswer);
    }
}