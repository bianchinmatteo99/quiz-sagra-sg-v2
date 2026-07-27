import { GameView, GameViewContext } from "../game.base";
import { CatenaState } from "./catena.contracts";
import { CatenaGameDefinition } from "./catena.definition";
import { ReazioneCatenaGameModel } from "./catena.model";

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
    gameDef: CatenaGameDefinition
    /**
     * Create a Catena view for an active controller or static timeline.
     *
     * If a context is provided, the definition is derived from the model.
     */
    constructor(ctx: CatenaGameViewContext | null = null, gameDef: CatenaGameDefinition | null = null) {
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
            ...this.gameDef.data.words.map(word => ((s:boolean)=>`Parola: ${s ? word : "***"}`)),
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
        const currentWord = this.activeGameContext.model.getCurrentWord();
        const currentWordLength = currentWord ? String(currentWord.length) : "?";
        const displayedWordLength = s ? currentWordLength : "***";
        const displayedCurrentWord = this.activeGameContext.model
            .getWordAsSecret(this.activeGameContext.model.currentWordIndex)
            ?.read(s)
            ?.toUpperCase() ?? "?";
        container.innerHTML = `
            Parola in corso: ${this.activeGameContext.model.currentWordIndex + 1} di ${this.gameDef.data.words.length}<br/>
            Lettere ${this.activeGameContext.model.currentWordLetters} di ${displayedWordLength}<br/>
            Parola corretta: ${displayedCurrentWord}
            ${this.gameDef.data.canRetryForSameWord ? "" : ("<br/>Persone escluse: " + this.activeGameContext.model.currentDenyList.length)}<br/>
            Punti per risposta: ${this.gameDef.data.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.gameDef.data.timeForAnswer}
        `;
    }

}