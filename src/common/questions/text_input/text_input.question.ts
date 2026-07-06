import { UserQuestionPage } from "../../../user/user.views";
import { EventPage } from "../../navigation/pages";
import { UserStateHandler } from "../../../user/user.state";
import { CancelHandle } from "../../general.utils";
import { Ender, Evaluator, Question, QuestionContext, QuestionModel } from "../question.base";
import { QuestionUserPageProvider } from "../question.user.base";

/**
 * Model for a text input question variant.
 *
 * Persists the metadata and lifecycle state for open-ended text response questions.
 * This is registered as "text-input" and displayed to participants as "Risposta testuale".
 */
class TextInputQuestionModel extends QuestionModel{
    readonly name = "text-input";
    readonly displayName = "Risposta testuale";
}

/**
 * Question implementation for open-ended text input responses.
 *
 * Orchestrates the lifecycle of a text input question, including answer collection,
 * evaluation (auto or manual), and result display. Participants submit free-form text
 * which can be evaluated using string comparison or custom predicates.
 */
export class TextInputQuestion extends Question {
    
    readonly model : TextInputQuestionModel;

    /**
     * Creates a text input question instance.
     * @param ctx Application context with database and people list.
     * @param evaluate Auto/manual evaluation configuration (e.g., exact match string or predicate).
     * @param stopAnswersCriteria Conditions for ending the answer collection phase (timer, manual stop, or custom predicate).
     * @param deny Optional list of participant ids who cannot submit an answer to this question.
     */
    constructor(ctx: QuestionContext, evaluate: Evaluator, stopAnswersCriteria: Ender, deny: string[]=[]){
        super(ctx, evaluate, stopAnswersCriteria);
        this.model = new TextInputQuestionModel(this, deny);
    }

}

/**
 * User-facing page for text input question responses.
 *
 * Renders a minimal form with a text input field and submit button.
 * Disables header and footer to focus the UI on the input field and submission.
 * Submits the text value when the user clicks the send button.
 */
class UserTextInputPage extends UserQuestionPage {
    shouldDisplayHeader = false;
    shouldDisplayFooter = false;

    /**
     * Attaches a click listener to the submit button that captures and submits the input value.
     * @returns Array containing the cleanup handler for the attached listener.
     */
    attachListeners(): CancelHandle[] {
        const input = this.container?.getElementsByTagName("input")[0] as HTMLInputElement;
        const button = this.container?.getElementsByTagName("button")[0] as HTMLButtonElement;
        return [this.attachListenerTo(button, "click", ()=>{
            this.onAnswer(input.value);
        })];
    }

    /**
     * Renders the text input form.
     *
     * Creates a labeled input field and submit button. Throws if the container
     * has not been created.
     * @throws Error if render is called before the page is created.
     */
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
        <span>La vostra risposta:</span>
        <input />
        <button>Invia</button>
        `;
    }
}

/**
 * Page provider factory for text input questions.
 *
 * Instantiates the appropriate UI page based on the question state lifecycle.
 * For the answer enabled phase, returns a {@link UserTextInputPage} for text submission.
 * For other phases (setup, already answered, evaluation, results), uses default pages
 * from the base class.
 */
export class TextInputQuestionPageProvider extends QuestionUserPageProvider {
    /**
     * Creates a page for the answer submission phase.
     * @param state User state handler (unused; provided by base interface contract).
     * @param onAnswer Callback invoked when the user submits their text answer.
     * @returns A page displaying the text input form.
     */
    whenAnswerEnabled(state: UserStateHandler, onAnswer: (answer: string) => void): EventPage {
        return new UserTextInputPage(onAnswer);
    }
}