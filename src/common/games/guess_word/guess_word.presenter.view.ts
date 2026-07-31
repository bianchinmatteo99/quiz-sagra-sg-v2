import { GamePresenterStateView } from "../games.presenter.base";
import { GuessWordGameDefinitionData, GuessWordGameStateSnapshot, GuessWordState } from "./guess_word.contract";

/**
 * Presenter-side renderer for Guess Word game state.
 *
 * Shows the active word, reveal progress, and core settings while respecting
 * the secret visibility toggle.
 */
export class GuessWordGamePresenterStateView extends GamePresenterStateView<GuessWordGameDefinitionData, GuessWordGameStateSnapshot> {
    /**
     * Render the Guess Word presenter panel.
     *
     * @param container Target element to fully replace with rendered content.
     * @param gameState Runtime snapshot from `/state/game`.
     * @param showSecrets Whether unrevealed word content can be shown in clear text.
     */
    render(container: HTMLElement, gameState: Partial<GuessWordGameStateSnapshot> | null, showSecrets: boolean): void {
        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? this.gameDefinition.title;

        const settings = document.createElement("div");
        const delay = (gameState?.delayBetweenLetterDisplay ?? this.gameDefinition.delayBetweenLetterDisplay)
        let sameLetters = ""
        switch(gameState?.sameLettersPolicy ?? this.gameDefinition.sameLettersPolicy){
            case "separate":
                sameLetters = "mostra lettere una alla volta"
                break;
            case "together":
                sameLetters = "mostra contemporaneamente lettere uguali"
                break;
            case "default":
                sameLetters = "mostra insieme lettere uguali se la risposta ha più di una parola"
        }
        const settingsLines = [
            `Punti per risposta corretta: ${gameState?.pointsForCorrectAnswer ?? this.gameDefinition.pointsForCorrectAnswer}`,
            `Stop alla prima risposta corretta: ${(gameState?.stopAtFirstCorrectAnswer ?? this.gameDefinition.stopAtFirstCorrectAnswer) ? "sì" : "no"}`,
            `Delay lettere: ${delay === false ? "manuale" : `${delay}s`}`,
            `Parole con lettere uguali: ${sameLetters}`,
        ];
        settings.textContent = settingsLines.join(" | ");

        const currentWordLabel = document.createElement("div");
        const currentWordIndex = gameState?.currentWordIndex ?? -1;
        const currentWord = this.gameDefinition.correctAnswers[currentWordIndex] ?? null;
        const displayedWord = showSecrets
            ? currentWord?.toUpperCase() ?? "NESSUNA PAROLA CORRENTE"
            : (gameState?.displayWord ?? "") || (currentWord ? "***" : "NESSUNA PAROLA CORRENTE");

        currentWordLabel.textContent = currentWord
            ? `PAROLA CORRENTE: ${displayedWord}`
            : "Nessuna parola corrente";

        const stateLabel = document.createElement("div");
        stateLabel.textContent = `Stato: ${gameState?.state ?? GuessWordState.STARTING}`;

        container.replaceChildren(title, settings, stateLabel, currentWordLabel);
    }
}
