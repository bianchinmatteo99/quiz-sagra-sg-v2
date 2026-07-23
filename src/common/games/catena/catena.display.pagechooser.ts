import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { CatenaState } from "./catena.model";

interface CatenaDisplayState {
    words: string[]
    /** Current game screen state. */
    state: CatenaState;
}

export class CatenaGamePageChooser extends GamePageChooser<CatenaDisplayState> {
    catena = new CatenaPage()
    decide(state: CatenaDisplayState): Page {
        if(state.state==CatenaState.DISPLAYCOVER){
            return new CoverPage()
        }
        this.catena.update(state.words)
        return this.catena
    }
}

class CoverPage extends StaticPage{
    templateColumnWidth = "1fr"
    render(): void {
        if(!this.container) throw new Error("Render called before create"); // <div style="height: 100%; display: flex;justify-content: flex-end;align-items: center;flex-direction:column;">
        this.container.innerHTML = `
                <h2>REAZIONE A CATENA</h2>
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

class CatenaPage extends StaticPage{
    templateColumnWidth = "600px"
    pastwords : string[]|null = null
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        if(!this.pastwords) throw new Error("Nothing to render")
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
        this.container.id = "catena"
    }
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