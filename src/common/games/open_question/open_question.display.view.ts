import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { OpenQuestionGameStateSnapshot, OpenQuestionState } from "./open_question.contracts";

export class OpenQuestionGamePageChooser extends GamePageChooser<OpenQuestionGameStateSnapshot> {
    decide(state: OpenQuestionGameStateSnapshot): Page {
        let title = state.title;
        let answer = null;

        if (state.state === OpenQuestionState.ASKINGQUESTION) {
            title = state.displayQuestion || state.title;
            answer = "???";
        }

        if (state.state === OpenQuestionState.SHOWINGANSWER) {
            answer = state.displayCorrectAnswer;
        }

        return new OpenQuestionPage(title, answer);
    }
}

class OpenQuestionPage extends StaticPage {
    templateColumnWidth = "75%";
    private readonly title: string;
    private readonly subtitle: string | null;

    constructor(title: string, subtitle: string | null = null) {
        super();
        this.title = title;
        this.subtitle = subtitle;
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.id = "open-question";
        this.container.innerHTML = `
            <style>
                #open-question {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 50px;
                    text-align: center;
                }
                #open-question .subtitle {
                    margin: 0;
                    font-size: 1.5em;
                    color: var(--pico-secondary);
                }
            </style>
            <h2>${this.title}</h2>
            ${this.subtitle ? `<div class="subtitle">${this.subtitle.toUpperCase()}</div>` : ""}
        `;
    }

    isEqualTo(other: Page): boolean {
        return other instanceof OpenQuestionPage && this.title === other.title && this.subtitle === other.subtitle;
    }
}
