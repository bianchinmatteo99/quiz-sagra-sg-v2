import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { GuessSongGameStateSnapshot, GuessSongState } from "./guess_song.contracts";

/**
 * Display-side page chooser for Guess Song snapshots.
 */
export class GuessSongGamePageChooser extends GamePageChooser<GuessSongGameStateSnapshot> {
    decide(state: GuessSongGameStateSnapshot): Page {
        let answer = null;
        if(state.state === GuessSongState.ASKINGQUESTION){
            answer = "???"
        }
        if(state.state === GuessSongState.SHOWINGANSWER){
            answer = state.displayCorrectAnswer
        }
        return new GuessSongPage(answer);
    }
}

/**
 * Single display page for the Guess Song game.
 *
 * Renders the game title when no subtitle is provided, or the game title with a
 * subtitle when a value is passed in.
 */
class GuessSongPage extends StaticPage {
    templateColumnWidth = "2fr";
    private readonly subtitle: string | null;

    constructor(subtitle: string | null = null) {
        super();
        this.subtitle = subtitle;
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.id = "guess-song";
        this.container.innerHTML = `
            <style>
                #guess-song {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 50px;
                    background: linear-gradient(rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.6)), url(/img/song.jpg);
                    background-repeat: no-repeat;
                    background-size: auto;
                    background-position: center;
                }
                #guess-song .subtitle {
                    font-size: 1.5rem;
                    color: var(--pico-secondary);
                }
            </style>
            <div class="title">Indovina la canzone</div>
            ${this.subtitle ? `<div class="subtitle">${this.subtitle.toUpperCase()}</div>` : ""}
        `;
    }

    isEqualTo(other: Page): boolean {
        return other instanceof GuessSongPage && this.subtitle === other.subtitle;
    }
}
