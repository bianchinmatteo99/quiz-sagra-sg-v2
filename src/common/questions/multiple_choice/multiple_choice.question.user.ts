import { UserQuestionPage } from "../../../user/user.views";
import { EventPage, Page } from "../../navigation/pages";
import { UserStateHandler } from "../../../user/user.state";
import { CancelHandle } from "../../general.utils";
import { QuestionUserPageProvider } from "../questions.user.base";

/**
 * User-facing page for four-option multiple-choice responses.
 */
class UserMultipleChoicePage extends UserQuestionPage {
    /** Hides the standard header to keep focus on answer entry. */
    shouldDisplayHeader = false;
    /** Hides the standard footer for a compact submission layout. */
    shouldDisplayFooter = false;

    attachListeners(): CancelHandle[] {
        const buttons = Array.from(this.container?.querySelectorAll<HTMLButtonElement>("button[data-answer]") ?? []);
        return buttons.map((button) => this.attachListenerTo(button, "click", () => {
            const answer = button.dataset.answer;
            if (answer) {
                this.onAnswer(answer);
            }
        }));
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
        <style>
        .multiple-choice-grid {
            width: min(560px, 100%);
            display: grid;
            grid-template-columns: repeat(2, minmax(120px, 1fr));
            gap: 12px;
            margin: 0 auto;
        }

        .multiple-choice-grid button {
            font-size: 2rem;
            font-weight: 700;
            padding: 24px 0;
            border-radius: 14px;
            transition: transform .08s;
        }

        .multiple-choice-grid button:active {
            transform: scale(0.98);
        }

        @media (max-width: 420px) {
            .multiple-choice-grid {
                grid-template-columns: 1fr;
            }
        }
        </style>
        <span>Scegli una risposta:</span>
        <div class="multiple-choice-grid">
            <button data-answer="A">A</button>
            <button data-answer="B">B</button>
            <button data-answer="C">C</button>
            <button data-answer="D">D</button>
        </div>
        `;
    }

    isEqualTo(other: Page): boolean {
        return other instanceof UserMultipleChoicePage;
    }
}

export class MultipleChoiceQuestionPageProvider extends QuestionUserPageProvider {
    /**
     * Creates a page with four answer buttons (A/B/C/D).
     */
    whenAnswerEnabled(state: UserStateHandler, onAnswer: (answer: string) => void): EventPage {
        return new UserMultipleChoicePage(onAnswer);
    }
}
