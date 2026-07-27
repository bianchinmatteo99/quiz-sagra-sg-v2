import { GamePresenterStateView } from "../games.presenter.base";

export class ReazioneCatenaGamePresenterStateView implements GamePresenterStateView {
    render(container: HTMLElement, gameState: Record<string, unknown> | null, showSecrets: boolean): void {
        if (!gameState) {
            container.textContent = "Nessuno stato gioco disponibile.";
            return;
        }

        const currentWordIndex = typeof gameState.currentWordIndex === "number" ? gameState.currentWordIndex : null;
        const currentWordLetters = typeof gameState.currentWordLetters === "number" ? gameState.currentWordLetters : null;
        const state = typeof gameState.state === "number" ? gameState.state : null;
        const words = Array.isArray(gameState.words) ? gameState.words : [];
        const currentWordRaw = currentWordIndex !== null ? words[currentWordIndex] : null;
        const currentWord = typeof currentWordRaw === "string" ? currentWordRaw : null;

        const list = document.createElement("ul");

        const appendItem = (label: string, value: string): void => {
            const li = document.createElement("li");
            li.textContent = `${label}: ${value}`;
            list.appendChild(li);
        };

        appendItem("Stato catena", state !== null ? String(state) : "n/d");
        appendItem("Parola indice", currentWordIndex !== null ? String(currentWordIndex + 1) : "n/d");
        appendItem("Lettere rivelate", currentWordLetters !== null ? String(currentWordLetters) : "n/d");
        appendItem("Parola corrente", showSecrets ? (currentWord ?? "n/d") : "***");

        container.replaceChildren(list);
    }
}