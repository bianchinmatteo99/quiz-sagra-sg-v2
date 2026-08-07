import { GamePresenterStateView } from "../games.presenter.base";
import { ScossaGameDefinitionData, ScossaGameStateSnapshot } from "./scossa.contracts";

export class ScossaGamePresenterStateView extends GamePresenterStateView<ScossaGameDefinitionData, ScossaGameStateSnapshot> {
    render(container: HTMLElement, gameState: Partial<ScossaGameStateSnapshot> | null, showSecrets: boolean): void {
        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? this.gameDefinition.title;

        const settings = document.createElement("div");
        settings.textContent = [
            `Punti risposta corretta: ${gameState?.pointsForCorrectAnswer ?? this.gameDefinition.pointsForCorrectAnswer}`,
            `Punti persi su risposta sbagliata: ${gameState?.pointsLostForWrongAnswer ?? this.gameDefinition.pointsLostForWrongAnswer}`,
        ].join(" | ");

        const words = gameState?.words ?? this.gameDefinition.words;
        const statuses = gameState?.displayWords ?? words.map(() => "available");
        const wrongWords = new Set(this.gameDefinition.wrongWords.map((w) => w.toUpperCase()));

        const list = document.createElement("div");
        list.innerHTML = words.map((word, index) => {
            const status = statuses[index] ?? "available";
            const marker = status === "wrong"
                ? "SCOSSA"
                : status === "correct"
                    ? "VA BENE"
                    : status === "selected"
                        ? "SELEZIONATA"
                        : "DISPONIBILE";

            const revealWrong = (showSecrets || status !== "available") && wrongWords.has(word.toUpperCase());
            return `${index + 1}. [${marker}] ${word}${revealWrong ? " - PAROLA SCOSSA" : ""}`;
        }).join("<br/>");

        container.replaceChildren(title, settings, list);
    }
}
