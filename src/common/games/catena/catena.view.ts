import { GameView, GameViewContext } from "../game.base";
import { ReazioneCatenaGameModel } from "./catena.model";

export interface CatenaGameViewContext extends GameViewContext{
    model: ReazioneCatenaGameModel;
}

export class ReazioneCatenaGameView extends GameView {
    
    activeGameContext: CatenaGameViewContext | null;
    constructor(ctx: CatenaGameViewContext | null = null){
        super();
        this.activeGameContext = ctx;
    }

    renderTimeline(container: HTMLElement): void {
        container.textContent = "Timeline di Catena" + (!!this.activeGameContext ? (" (parola " + this.activeGameContext.model.currentWordIndex + ")") : "")
    }
    renderCurrentState(container : HTMLElement): void {
        if(!this.activeGameContext) return;
        const s = this.canDisplaySecrets();
        const secret = (text:string):string => s ? text : "***";
        const word = this.activeGameContext.model.getCurrentWord();
        const lett = this.activeGameContext.model.currentWordLetters;
        container.textContent = `
            Parola in corso: ${this.activeGameContext.model.currentWordIndex+1} di ${this.activeGameContext.model.definition.words.length}<br/>
            Lettere ${lett} di ${secret(String(word?.length ?? "?"))}<br/>
            Parola corretta: ${!!word ? word.slice(0,lett).toUpperCase() + secret(word.slice(lett)).toUpperCase() : "?"}
            ${this.activeGameContext.model.definition.canRetryForSameWord ? "" : ("<br/>Persone escluse: " + this.activeGameContext.model.currentDenyList.length)}<br/>
            Punti per risposta: ${this.activeGameContext.model.definition.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.activeGameContext.model.definition.timeForAnswer}
        `;
    }
    
}