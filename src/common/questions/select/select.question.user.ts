import { UserStateHandler } from "../../../user/user.state";
import { CancelHandle } from "../../general.utils";
import { EventPage, Page } from "../../navigation/pages";
import { QuestionUserPageProvider } from "../questions.user.base";
import { UserQuestionPage } from "../../../user/user.views";
import { SelectQuestionStateSnapshot } from "./select.question.contract";

/**
 * User-facing page for select question responses.
 */
class UserSelectQuestionPage extends UserQuestionPage {
    shouldDisplayHeader = false;
    shouldDisplayFooter = false;

    private options: string[];

    constructor(onAnswer: (answer: string) => void, options: string[]) {
        super(onAnswer);
        this.options = options;
    }

    attachListeners(): CancelHandle[] {
        const input = this.container?.getElementsByTagName("select")[0] as HTMLSelectElement;
        const button = this.container?.getElementsByTagName("button")[0] as HTMLButtonElement;
        return [this.attachListenerTo(button, "click", () => {
            this.onAnswer(input.value);
        })];
    }

    private escapeHtml(value: string): string {
        return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");

        const optionsHtml = this.options.map((value) => {
            const escaped = this.escapeHtml(value);
            return `<option value="${escaped}">${escaped}</option>`;
        }).join("");

        const hasOptions = this.options.length > 0;
        this.container.innerHTML = `
        <span>La vostra risposta:</span>
        <select ${hasOptions ? "" : "disabled"}>
            ${hasOptions ? optionsHtml : "<option>Nessuna opzione disponibile</option>"}
        </select>
        <button ${hasOptions ? "" : "disabled"}>Invia</button>
        `;
    }

    isEqualTo(other: Page): boolean {
        return other instanceof UserSelectQuestionPage && this.options.every((v,i)=>v==other.options[i]);
    }
}

export class SelectQuestionPageProvider extends QuestionUserPageProvider {
    whenAnswerEnabled(state: UserStateHandler, onAnswer: (answer: string) => void): EventPage {
        const questionState = state.read?.app.question as SelectQuestionStateSnapshot | undefined;
        const possibleWords = questionState?.possibleWords ?? [];
        return new UserSelectQuestionPage(onAnswer, possibleWords);
    }
}
