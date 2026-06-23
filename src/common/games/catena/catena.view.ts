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
        container.textContent = `
            Parola in corso: ${this.activeGameContext.model.currentWordIndex+1} di ${this.activeGameContext.model.definition.words.length}<br/>
            Lettere ${this.activeGameContext.model.currentWordLetters} di ${secret(String(word.length))}<br/>
            Parola corretta: ${secret(word).toUpperCase()}
            ${this.activeGameContext.model.definition.canRetryForSameWord ? "" : ("<br/>Persone escluse: " + this.activeGameContext.model.currentDenyList.length)}<br/>
            Punti per risposta: ${this.activeGameContext.model.definition.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.activeGameContext.model.definition.timeForAnswer}
        `;
    }
    
}