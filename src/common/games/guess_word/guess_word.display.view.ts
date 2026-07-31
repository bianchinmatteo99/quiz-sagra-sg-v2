import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { GuessWordGameStateSnapshot, GuessWordState } from "./guess_word.contract";

/**
 * Display-side page chooser for Guess Word snapshots.
 *
 * Shows the word only while the game is actively asking a question.
 */
export class GuessWordGamePageChooser extends GamePageChooser<GuessWordGameStateSnapshot> {
    /** Reused page to keep the current word updated in place. */
    private wordPage = new GuessWordWordPage();

    /**
     * Select the display page for the current Guess Word snapshot.
     *
     * @param state Current game snapshot from display state.
     * @returns A word page only while asking; otherwise a simple waiting page.
     */
    decide(state: GuessWordGameStateSnapshot): Page {
        if (state.state === GuessWordState.ASKINGQUESTION) {
            this.wordPage.update(state.displayWord);
            return this.wordPage;
        }
        this.clear();
        return new GuessWordCoverPage(state.title);
    }

    clear(): void {
        this.wordPage = new GuessWordWordPage();
    }
}

/**
 * Simple waiting page shown outside the active asking phase.
 */
class GuessWordCoverPage extends StaticPage {
    templateColumnWidth = "1fr";
    private readonly title: string;

    constructor(title: string) {
        super();
        this.title = title;
    }

    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
                <h2>${this.title.toUpperCase()}</h2>
                <img src="/img/guess_word.png" style="height:50%;"/>
        `;
        Object.assign(this.container.style, {
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexDirection: "column"
        })
    }
}

/**
 * Display page that renders the current word with equispaced letters.
 *
 * Masked characters are shown as underscore-like placeholders and the page can
 * be updated repeatedly while the asking phase stays active.
 */
class GuessWordWordPage extends StaticPage {
    templateColumnWidth = "70%";
    private displayWord: string = "";
    private wordContainer: HTMLElement | null = null;

    update(displayWord: string): void {
        if(this.displayWord === displayWord) return;
        this.displayWord = displayWord;
        if (this.container) {
            this.updateWord();
        }
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.id = "guess-word";
        this.container.innerHTML = `
            <style>
                #guess-word {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    text-align: center;
                }
                #guess-word .word {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-items: flex-end;
                    gap: 0.05em;
                    font-family: "Courier New", monospace;
                    font-weight: 700;
                    font-size: clamp(2rem, 6vw, 5rem);
                    letter-spacing: 0.18em;
                    line-height: 1.1;
                    text-transform: uppercase;
                    white-space: pre;
                }
                #guess-word .letter {
                    display: inline-flex;
                    justify-content: center;
                    align-items: flex-end;
                    min-width: 1ch;
                }
                #guess-word .letter.masked {
                    border-bottom: 0.12em solid currentColor;
                    padding-bottom: 0.08em;
                }
                #guess-word .gap {
                    display: inline-flex;
                    width: 0.8em;
                }
            </style>
            
            <div class="word"></div>
            
        `;

        this.wordContainer = this.container.querySelector("#guess-word .word");
        this.updateWord();
    }

    private updateWord(): void {
        if (!this.wordContainer) {
            return;
        }

        this.wordContainer.innerHTML = this.displayWord
            .toUpperCase()
            .split("")
            .map((letter) => {
                if (letter === "*") {
                    return `<span class="letter masked">_</span>`;
                }
                if (letter === " ") {
                    return `<span class="gap">&nbsp;</span>`;
                }
                return `<span class="letter">${letter}</span>`;
            })
            .join("");
    }
}
