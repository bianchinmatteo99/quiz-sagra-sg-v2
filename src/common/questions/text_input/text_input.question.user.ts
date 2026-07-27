import { UserQuestionPage } from "../../../user/user.views";
import { EventPage } from "../../navigation/pages";
import { UserStateHandler } from "../../../user/user.state";
import { CancelHandle } from "../../general.utils";
import { QuestionUserPageProvider } from "../questions.user.base";

/**
 * User-facing page for text input question responses.
 *
 * Renders a minimal form with a text input field and submit button.
 * Disables header and footer to focus the UI on the input field and submission.
 * Submits the text value when the user clicks the send button.
 */
class UserTextInputPage extends UserQuestionPage {
    /** Hides the standard header to keep focus on answer entry. */
    shouldDisplayHeader = false;
    /** Hides the standard footer for a compact submission layout. */
    shouldDisplayFooter = false;

    /**
     * Attaches a click listener to the submit button that captures and submits the input value.
     *
     * The emitted value is the raw input text; normalization and persistence are
     * handled by upstream question/user state flows.
     * @returns Array containing the cleanup handler for the attached listener.
     */
    attachListeners(): CancelHandle[] {
        const input = this.container?.getElementsByTagName("input")[0] as HTMLInputElement;
        const button = this.container?.getElementsByTagName("button")[0] as HTMLButtonElement;
        return [this.attachListenerTo(button, "click", () => {
            this.onAnswer(input.value);
        })];
    }

    /**
     * Renders the text input form.
     *
     * Creates a labeled input field and submit button. Throws if the container
     * has not been created.
    *
    * The template intentionally remains minimal because question-level state,
    * feedback, and transitions are handled by the parent user flow.
     * @throws Error if render is called before the page is created.
     */
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
        <span>La vostra risposta:</span>
        <input />
        <button>Invia</button>
        `;
    }
}

/**
 * User-page provider for text input questions.
 *
 * Instantiates the appropriate UI page based on the question state lifecycle.
 * For the answer enabled phase, returns a {@link UserTextInputPage} for text submission.
 * For other phases (setup, already answered, evaluation, results), uses default pages
 * from the base class.
 */
export class TextInputQuestionPageProvider extends QuestionUserPageProvider {
    /**
     * Creates a page for the answer submission phase.
     * @param state User state handler (currently unused; part of the shared provider contract).
     * @param onAnswer Callback invoked when the user submits their text answer.
     * @returns A page displaying the text input form.
     */
    whenAnswerEnabled(state: UserStateHandler, onAnswer: (answer: string) => void): EventPage {
        return new UserTextInputPage(onAnswer);
    }
}