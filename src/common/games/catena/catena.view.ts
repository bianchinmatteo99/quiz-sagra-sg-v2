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
        container.textContent = "Stato attuale di Catena" + (!!this.activeGameContext ? (" (parola " + this.activeGameContext.model.currentWordIndex + (document.getElementById("mostra-segreti") as HTMLInputElement).checked ? this.activeGameContext.model.definition.words[this.activeGameContext.model.currentWordIndex ] : "" + ")") : "")
    }
    
}