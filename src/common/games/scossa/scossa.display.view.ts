import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { ScossaGameStateSnapshot } from "./scossa.contracts";

export class ScossaGamePageChooser extends GamePageChooser<ScossaGameStateSnapshot> {
    private readonly wordsPage = new ScossaWordsPage();

    decide(state: ScossaGameStateSnapshot): Page {
        this.wordsPage.update(state.title, state.words, state.displayWords);
        return this.wordsPage;
    }
}

class ScossaWordsPage extends StaticPage {
    templateColumnWidth = "1fr";
    disableQuestionView = true;

    private title = "";
    private words: string[] = [];
    private displayWords: ScossaGameStateSnapshot["displayWords"] = [];

    update(title: string, words: string[], displayWords: ScossaGameStateSnapshot["displayWords"]): void {
        this.title = title;
        this.words = [...words];
        this.displayWords = [...displayWords];

        if (this.container) {
            this.render();
        }
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");

        const items = this.words.map((word, index) => {
            const state = this.displayWords[index] ?? "available";
            return `<div class="scossa-word ${state}">${word}</div>`;
        }).join("");

        this.container.id = "scossa-grid-page"
        this.container.innerHTML = `
            <style>
                #scossa-grid-page {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 24px;
                    text-align: center;
                }
                #scossa-grid-page h2 {
                    font-size: 1.4rem;
                    margin: 0;
                }

                #scossa-grid-page .scossa-grid {
                    width: 100%;
                    flex: 1;
                    display: grid;
                    grid-template-columns: repeat(3, minmax(auto, 1fr));
                    overflow-y: auto;
                }

                #scossa-grid-page .scossa-word {
                    padding: 16px 12px;
                    border: 3px solid transparent;
                    border-radius: 14px;
                    background: rgba(255, 255, 255, 0.06);
                    font-weight: 700;
                }

                #scossa-grid-page .scossa-word.correct {
                    background: #d8d8d8;
                    color: #6b6b6b;
                }

                #scossa-grid-page .scossa-word.wrong {
                    background: #c64040;
                    color: #fff;
                }

                #scossa-grid-page .scossa-word.selected {
                    border-color: var(--pico-primary);
                }

                @media (max-width: 900px) {
                    #scossa-grid-page .scossa-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 520px) {
                    #scossa-grid-page .scossa-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            <section id="scossa-grid-page">
                <h2>${this.title.toUpperCase()}</h2>
                <div class="scossa-grid">${items}</div>
            </section>
        `;
    }
}
