import { GamePresenterStateView } from "../games.presenter.base";

export class ReazioneCatenaGamePresenterStateView implements GamePresenterStateView {
    render(container: HTMLElement, gameState: unknown, showSecrets: boolean): void {
        if (!gameState || typeof gameState !== "object") {
            container.textContent = "Nessuno stato gioco disponibile.";
            return;
        }

        const stateData = gameState as Record<string, unknown>;
        const displayName = typeof stateData.displayName === "string" ? stateData.displayName : "Reazione a Catena";
        const currentWordIndex = typeof stateData.currentWordIndex === "number" ? stateData.currentWordIndex : null;
        const currentWordLetters = typeof stateData.currentWordLetters === "number" ? stateData.currentWordLetters : null;
        const pointsForCorrectAnswer = typeof stateData.pointsForCorrectAnswer === "number" ? stateData.pointsForCorrectAnswer : null;
        const timeForAnswer = typeof stateData.timeForAnswer === "number" ? stateData.timeForAnswer : null;
        const canRetryForSameWord = typeof stateData.canRetryForSameWord === "boolean" ? stateData.canRetryForSameWord : null;
        const words = Array.isArray(stateData.words)
            ? stateData.words.map((word) => typeof word === "string" ? word : null)
            : [];

        const title = document.createElement("h3");
        title.textContent = displayName;

        const settings = document.createElement("div");
        const settingsLines = [
            pointsForCorrectAnswer !== null ? `Punti per risposta corretta: ${pointsForCorrectAnswer}` : null,
            timeForAnswer !== null ? `Tempo per risposta: ${timeForAnswer}s` : null,
            canRetryForSameWord !== null ? `Tentativi sulla stessa parola: ${canRetryForSameWord ? "consentiti" : "non consentiti"}` : null,
        ].filter((value): value is string => value !== null);
        settings.textContent = settingsLines.join(" | ");

        const list = document.createElement("ul");

        const appendWord = (value: string): void => {
            const li = document.createElement("li");
            li.textContent = value;
            list.appendChild(li);
        };

        words.forEach((word, index) => {
            appendWord(this.formatWord(word, index, currentWordIndex, currentWordLetters, showSecrets));
        });

        container.replaceChildren(title, settings, list);
    }

    private formatWord(
        word: string | null,
        index: number,
        currentWordIndex: number | null,
        currentWordLetters: number | null,
        showSecrets: boolean,
    ): string {
        if (!word) {
            return "***";
        }

        if (showSecrets) {
            return word.toUpperCase();
        }

        if (currentWordIndex === null) {
            return "***";
        }

        if (index < currentWordIndex) {
            return word.toUpperCase();
        }

        if (index > currentWordIndex) {
            return "***";
        }

        const revealedLetters = Math.max(0, Math.min(currentWordLetters ?? 0, word.length));
        const visiblePart = word.slice(0, revealedLetters).toUpperCase();
        return revealedLetters === word.length ? visiblePart : `${visiblePart}***`;
    }
}