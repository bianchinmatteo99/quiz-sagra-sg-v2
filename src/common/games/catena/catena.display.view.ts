import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { CatenaGameStateSnapshot, CatenaState } from "./catena.contracts";

/**
 * Display-side page chooser for Catena snapshots.
 *
 * Reuses a single chain page instance for incremental updates while returning
 * a dedicated cover page during the opening states.
 */
export class CatenaGamePageChooser extends GamePageChooser<CatenaGameStateSnapshot> {
    /** Reused chain page to preserve rendered state and animate deltas. */
    catena = new CatenaPage()

    /**
     * Select the display page for the current Catena snapshot.
     * @param state Current game snapshot from display state.
     * @returns Cover page during startup/cover states, otherwise the chain page.
     */
    decide(state: CatenaGameStateSnapshot): Page {
        if(state.state==CatenaState.STARTING || state.state==CatenaState.DISPLAYCOVER){
            return new CoverPage(state.title)
        } else {
            this.catena.update(state.words)
            return this.catena
        }
    }
}

/**
 * Static Catena cover shown before the chain is revealed.
 */
class CoverPage extends StaticPage{
    /** Single-column layout used by the display container. */
    templateColumnWidth = "1fr"
    title : string

    constructor(title: string){
        super()
        this.title = title
    }
    /**
     * Render title and themed image for the Catena opening screen.
     */
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
                <h2>${this.title.toUpperCase()}</h2>
                <img src="/img/domino.jpg" style="height:50%;"/>
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
 * Static page that renders the Catena chain words and reveal animations.
 *
 * The page receives masked/unmasked word strings from snapshots and updates only
 * changed letters to keep transitions smooth on the display surface.
 */
class CatenaPage extends StaticPage{
    /** Preferred fixed content width for the chain column. */
    templateColumnWidth = "600px"
    /** Last rendered snapshot words used for incremental diff updates. */
    pastwords : string[]|null = null

    /**
     * Render the full chain using the most recent words snapshot.
     * @throws Error When called before create or before any words are available.
     */
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        if(!this.pastwords) throw new Error("Nothing to render");
        this.container.id = "catena"
        this.container.innerHTML = `
            <style>
                #catena{
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 10px;
                }
                #catena > .word {
                    display: flex;
                    justify-content: start;
                    padding: 5px 20px;
                    border: 2px solid var(--pico-primary-border);
                    border-radius: 20px;
                    box-sizing: content-box;
                    min-height: 1em;
                }
                #catena > .word > .letter {
                    width: .8em;
                    height: 1em;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    font-family: "Courier New", monospace;
                    font-weight: bold;
                }
            </style>
            ${
                this.pastwords.map((v,i)=>`
                    <div id="catena-word-${i}" class="word">${v.replaceAll("*","").split("").map((l)=>`
                            <span class="letter">${l.toUpperCase()}</span>
                        `).join("")}</div>
                `).join("")
            }
        `;
    }

    /**
     * Apply snapshot updates to the rendered chain.
     *
     * When the container already exists, only appended letters for changed words
     * are inserted and animated. Before first render, words are cached until the
     * page is mounted.
     *
     * @param words Latest snapshot words array from Catena state.
     */
    update(words: string[]){
        if(!this.container){
            this.pastwords = words;
            return;
        }
        if(!this.pastwords){
            this.pastwords = words;
            this.render();
            return;
        }
        let mode = 0
        for(let i = 0; i<words.length; i++){
            if(this.pastwords[i]!=words[i]){
                mode = Math.max(mode, words[i].endsWith("*") ? 1 : 2)
                const newLetters = words[i].replaceAll("*","").slice(this.pastwords[i].replaceAll("*","").length).split("")
                this.container.querySelector(`#catena-word-${i}`)?.insertAdjacentHTML("beforeend", newLetters.map((l)=>`<span class="letter animate" data-target-letter="${l}"></span>`).join(""))
            }
        }
        this.pastwords = words
        if(mode>0){
            this.startAnimation(mode>1 ? 5000 : 1000)
        }
    }

    /**
     * Animate newly inserted letters from random glyphs to final characters.
     *
     * A longer duration is used when a full word is completed, while shorter
     * duration is used for per-letter reveal progression.
     *
     * @param duration Animation duration in milliseconds.
     */
    startAnimation(duration : number){
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const targets = this.container!.querySelectorAll<HTMLElement>(".letter.animate")
        const int = setInterval(()=>{
            targets.forEach((v)=>{
                v.textContent = alphabet[Math.floor(Math.random() * alphabet.length)];
            })
        }, 50)

        setTimeout(()=>{
            clearInterval(int)
            targets.forEach((v)=>{
                v.textContent = v.dataset.targetLetter!.toUpperCase()
                v.classList.remove("animate")
            })
        }, duration)
    }
}
