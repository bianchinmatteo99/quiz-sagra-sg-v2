import { GamePresenterStateView } from "../games.presenter.base";
import { CatenaGameDefinitionData, CatenaGameStateSnapshot } from "./catena.contracts";

/**
 * Presenter-side renderer for Catena game state.
 *
 * Combines immutable game definition data with the live `/state/game` snapshot
 * to show current progression, settings, and the chain word list.
 */
export class CatenaGamePresenterStateView extends GamePresenterStateView<CatenaGameDefinitionData, CatenaGameStateSnapshot> {
    /**
     * Render the Catena presenter panel.
     *
     * @param container Target element to fully replace with rendered content.
     * @param gameState Runtime snapshot from `/state/game`.
     * @param showSecrets Whether unrevealed word content can be shown in clear text.
     */
    render(container: HTMLElement, gameState: Partial<CatenaGameStateSnapshot> | null, showSecrets: boolean): void {
        const currentWordIndex = gameState?.currentWordIndex ?? 0;
        const currentWordLetters = gameState?.currentWordLetters ?? 0;

        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? null;

        const settings = document.createElement("div");
        const settingsLines = [
            `Punti per risposta corretta: ${gameState?.pointsForCorrectAnswer}`,
            `Tempo per risposta: ${gameState?.timeForAnswer}s`,
            `Tentativi sulla stessa parola: ${(gameState?.canRetryForSameWord) ? "consentiti" : "non consentiti"}`,
        ];
        settings.textContent = settingsLines.join(" | ");

        const list = document.createElement("ul");

        const appendWord = (value: string): void => {
            const li = document.createElement("li");
            li.textContent = value;
            list.appendChild(li);
        };

        this.gameDefinition.words.forEach((word, index) => {
            appendWord(this.formatWord(word, index, currentWordIndex, currentWordLetters, showSecrets));
        });

        container.replaceChildren(title, settings, list);
    }

    /**
     * Format one chain word according to reveal progress and secret visibility.
     *
     * Rules:
     * - secrets enabled: always reveal full word,
     * - past words: always revealed,
     * - future words: fully masked,
     * - current word: show revealed prefix plus masking suffix.
     *
     * @param word Source word from the immutable game definition.
     * @param index Word index in the configured chain.
     * @param currentWordIndex Active word index from runtime snapshot.
     * @param currentWordLetters Revealed letter count for active word.
     * @param showSecrets Whether secrets can be shown in clear text.
     * @returns Uppercase display label for presenter output.
     */
    private formatWord(
        word: string,
        index: number,
        currentWordIndex: number,
        currentWordLetters: number,
        showSecrets: boolean,
    ): string {
        if (showSecrets) {
            return word.toUpperCase();
        }

        if (index < currentWordIndex) {
            return word.toUpperCase();
        }

        if (index > currentWordIndex) {
            return "***";
        }

        const revealedLetters = Math.max(0, Math.min(currentWordLetters, word.length));
        const visiblePart = word.slice(0, revealedLetters).toUpperCase();
        return revealedLetters === word.length ? visiblePart : `${visiblePart}***`;
    }
}