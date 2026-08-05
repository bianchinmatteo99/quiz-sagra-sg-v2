import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { NumericEstimationGameStateSnapshot, NumericEstimationState } from "./numeric_estimation.contracts";

export class NumericEstimationGamePageChooser extends GamePageChooser<NumericEstimationGameStateSnapshot> {
    decide(state: NumericEstimationGameStateSnapshot): Page {
        let title = state.title;
        let answer = null;

        if (state.state === NumericEstimationState.ASKINGQUESTION) {
            title = state.displayQuestion || state.title;
            answer = "???";
        }

        if (state.state === NumericEstimationState.SHOWINGANSWER) {
            title = state.displayQuestion || state.title;
            answer = state.displayCorrectAnswer;
        }

        return new NumericEstimationPage(title, answer);
    }
}

class NumericEstimationPage extends StaticPage {
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
        this.container.id = "numeric-estimation";
        this.container.innerHTML = `
            <style>
                #numeric-estimation {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 50px;
                    text-align: center;
                    margin: 0 20px;
                }
                #numeric-estimation h2 {
                    font-size: 1.5em;
                }
                #numeric-estimation .subtitle {
                    font-size: 1.5rem;
                    color: var(--pico-secondary);
                }
            </style>
            <h2>${this.title}</h2>
            ${this.subtitle ? `<div class="subtitle">${this.subtitle.toUpperCase()}</div>` : ""}
        `;
    }

    isEqualTo(other: Page): boolean {
        return other instanceof NumericEstimationPage && this.title === other.title && this.subtitle === other.subtitle;
    }
}
