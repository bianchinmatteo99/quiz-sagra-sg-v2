import { GameView, GameViewContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { ReazioneCatenaGameModel } from "./catena.model";

export interface CatenaGameViewContext extends GameViewContext {
    model: ReazioneCatenaGameModel;
}

export class ReazioneCatenaGameView extends GameView {

    activeGameContext: CatenaGameViewContext | null;
    gameDef: ReazioneCatenaGameDefinition
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

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo e catena vuota", 
            ...this.gameDef.words.map(word => ((s:boolean)=>`Parola: ${s ? word : "***"}`)),
            "Conclusione"]
    }
    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        return this.activeGameContext.model.currentWordIndex + 1;
    }

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const s = this.canDisplaySecrets();
        container.innerHTML = `
            Parola in corso: ${this.activeGameContext.model.currentWordIndex + 1} di ${this.gameDef.words.length}<br/>
            Lettere ${this.activeGameContext.model.currentWordLetters} di ${this.activeGameContext.model.getSecret<string>("currentwordlength", s) ?? "?"}<br/>
            Parola corretta: ${this.activeGameContext.model.getSecret<string>("currentword", s) ?? "?"}
            ${this.gameDef.canRetryForSameWord ? "" : ("<br/>Persone escluse: " + this.activeGameContext.model.currentDenyList.length)}<br/>
            Punti per risposta: ${this.gameDef.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.gameDef.timeForAnswer}
        `;
    }

}