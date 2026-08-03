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
    private static readonly MAX_LINE_LENGTH = 15;
    private static readonly RETURN_MARKER = "↵";

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
                    flex-direction: column;
                    flex-wrap: nowrap;
                    justify-content: center;
                    align-items: center;
                    gap: .1em;
                    font-family: "Courier New", monospace;
                    font-weight: 700;
                    font-size: 1.6rem;
                    letter-spacing: 0.05em;
                    line-height: 1.1;
                    text-transform: uppercase;
                    white-space: pre;
                }
                #guess-word .line {
                    display: flex;
                    flex-wrap: nowrap;
                    justify-content: center;
                    align-items: center;
                }
                #guess-word .letter {
                    display: inline-flex;
                    justify-content: center;
                    align-items: flex-end;
                    min-width: 1ch;
                }
                #guess-word .letter.masked {
                    padding-bottom: 0.08em;
                    letter-spacing: 15px;
                    font-size: .9em;
                }
                #guess-word .gap {
                    display: inline-flex;
                }
                #guess-word .word-break-symbol{
                    transform: translate(-.3em, .7em);
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

        const maxLineLength = GuessWordWordPage.MAX_LINE_LENGTH;
        const words = this.displayWord.toUpperCase().trim().split(/\s+/).filter((word) => word.length > 0);

        const lines: string[] = [];
        let currentLine = "";
        let index = 0;

        while (index < words.length) {
            let word = words[index]!;

            if (word.length > maxLineLength) {
                const maxChunk = maxLineLength - 1;
                const minTailLength = 2;
                const maxByTail = Math.max(1, word.length - minTailLength);
                const chunkLength = Math.min(maxChunk, maxByTail);
                const chunk = word.slice(0, chunkLength) + GuessWordWordPage.RETURN_MARKER;

                if (currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = "";
                }

                lines.push(chunk);
                words[index] = word.slice(chunkLength);
                continue;
            }

            if (currentLine.length === 0) {
                currentLine = word;
                index++;
                continue;
            }

            const candidate = `${currentLine} ${word}`;
            if (candidate.length <= maxLineLength) {
                currentLine = candidate;
                index++;
            } else {
                lines.push(currentLine);
                currentLine = "";
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        this.wordContainer.innerHTML = lines
            .map((line) => `<span class="line">${this.lettersToSpan(line)}</span>`)
            .join("");
    }

    private lettersToSpan(letters: string): string {
        return letters
            .split("")
            .map((letter) => {
                if (letter === "*") {
                    return `<span class="letter masked">_</span>`;
                }
                if(letter === GuessWordWordPage.RETURN_MARKER){
                    return `<span class="letter word-break-symbol">${letter}</span>`;
                }
                if (letter === " ") {
                    return `<span class="gap">&nbsp;</span>`;
                }
                return `<span class="letter">${letter}</span>`;
            })
            .join("");
    }
}
