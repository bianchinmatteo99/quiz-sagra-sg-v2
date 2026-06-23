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

    renderTimeline(container: HTMLElement): void {
        const currentStep = (this.activeGameContext?.model.currentWordIndex ?? Infinity) + 1;
        const steps = ["Mostra titolo e catena vuota", ...this.gameDef.words.entries().map(([i, word]) => `Parola: ${(i + 1 < currentStep || this.canDisplaySecrets()) ? word : "***"}`), "Conclusione"];

        const stepHtmlBuilder = (title: string, state: string) => `
        <article class="game-steps-list-item ${state == "current" ? "active" : ""}">${title}</article>
        `;

        container.innerHTML = steps.entries().map(([i, title])=>stepHtmlBuilder(title, (i == currentStep ? "current" : (i < currentStep ? "past" : "future")))).toArray().join("\n")
    }
    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const word = this.activeGameContext.model.getCurrentWord();
        const lett = this.activeGameContext.model.currentWordLetters;
        const s = this.canDisplaySecrets() || word?.length == lett;
        const secret = (text: string): string => s ? text : "***";
        container.innerHTML = `
            Parola in corso: ${this.activeGameContext.model.currentWordIndex + 1} di ${this.gameDef.words.length}<br/>
            Lettere ${lett} di ${secret(String(word?.length ?? "?"))}<br/>
            Parola corretta: ${!!word ? word.slice(0, lett).toUpperCase() + secret(word.slice(lett)).toUpperCase() : "?"}
            ${this.gameDef.canRetryForSameWord ? "" : ("<br/>Persone escluse: " + this.activeGameContext.model.currentDenyList.length)}<br/>
            Punti per risposta: ${this.gameDef.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.gameDef.timeForAnswer}
        `;
    }

}