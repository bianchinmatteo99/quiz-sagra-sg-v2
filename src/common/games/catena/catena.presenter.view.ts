import { GamePresenterStateView } from "../games.presenter.base";
import { CatenaDefinitionData, decodeCatenaGameStateSnapshot } from "./catena.contracts";

export class ReazioneCatenaGamePresenterStateView extends GamePresenterStateView<CatenaDefinitionData> {
    render(container: HTMLElement, gameState: unknown, showSecrets: boolean): void {
        const stateData = decodeCatenaGameStateSnapshot(gameState);
        if (!stateData) {
            container.textContent = "Nessuno stato gioco disponibile.";
            return;
        }

        const title = document.createElement("h3");
        title.textContent = this.gameDefinition.title ?? this.gameDefinition.name;

        const settings = document.createElement("div");
        const settingsLines = [
            `Punti per risposta corretta: ${this.gameDefinition.pointsForCorrectAnswer}`,
            `Tempo per risposta: ${this.gameDefinition.timeForAnswer}s`,
            `Tentativi sulla stessa parola: ${this.gameDefinition.canRetryForSameWord ? "consentiti" : "non consentiti"}`,
        ];
        settings.textContent = settingsLines.join(" | ");

        const list = document.createElement("ul");

        const appendWord = (value: string): void => {
            const li = document.createElement("li");
            li.textContent = value;
            list.appendChild(li);
        };

        this.gameDefinition.words.forEach((word, index) => {
            appendWord(this.formatWord(word, index, stateData.currentWordIndex, stateData.currentWordLetters, showSecrets));
        });

        container.replaceChildren(title, settings, list);
    }

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