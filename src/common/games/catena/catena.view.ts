import { GameView, GameViewContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { CatenaState, ReazioneCatenaGameModel } from "./catena.model";

/**
 * View context for the Catena game.
 *
 * Extends the generic view context with access to the Catena model.
 */
export interface CatenaGameViewContext extends GameViewContext {
    model: ReazioneCatenaGameModel;
}

/**
 * Catena-specific view implementation.
 *
 * Renders the live progress of the chain and builds the timeline for
 * static or active display modes.
 */
export class ReazioneCatenaGameView extends GameView {

    activeGameContext: CatenaGameViewContext | null;
    gameDef: ReazioneCatenaGameDefinition
    /**
     * Create a Catena view for an active controller or static timeline.
     *
     * If a context is provided, the definition is derived from the model.
     */
    constructor(ctx: CatenaGameViewContext | null = null, gameDef: ReazioneCatenaGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        if (!!ctx) {
            this.gameDef = ctx.model.definition;
        } else if (!!gameDef) {
            this.gameDef = gameDef;
        } else {
            throw new Error("Unable to instantiate the game if no gameDef is provided, neither directly or in context")
        }
    }

    /**
     * Build the Catena timeline steps used by the game preview and progress.
     */
    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo", 
            ...this.gameDef.words.map(word => ((s:boolean)=>`Parola: ${s ? word : "***"}`)),
            "Conclusione"]
    }
    /**
     * Compute the currently active timeline step for an active game.
     */
    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        if(this.activeGameContext.model.state==CatenaState.DISPLAYCOVER){
            return 0
        } else {
            return this.activeGameContext.model.currentWordIndex + 1;
        }
    }

    /**
     * Render the current Catena game state into the provided container.
     */
    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const s = this.canDisplaySecrets();
        container.innerHTML = `
            Parola in corso: ${this.activeGameContext.model.currentWordIndex + 1} di ${this.gameDef.words.length}<br/>
            Lettere ${this.activeGameContext.model.currentWordLetters} di ${this.activeGameContext.model.getSecret<string>("currentwordlength", s) ?? "?"}<br/>
            Parola corretta: ${this.activeGameContext.model.getSecret<string>("currentword", s)?.toUpperCase() ?? "?"}
            ${this.gameDef.canRetryForSameWord ? "" : ("<br/>Persone escluse: " + this.activeGameContext.model.currentDenyList.length)}<br/>
            Punti per risposta: ${this.gameDef.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.gameDef.timeForAnswer}
        `;
    }

}