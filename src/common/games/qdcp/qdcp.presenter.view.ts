import { GamePresenterStateView } from "../games.presenter.base";
import { QDCPGameDefinitionData, QDCPGameStateSnapshot, QDCPState } from "./qdcp.contracts";

export class QDCPGamePresenterStateView extends GamePresenterStateView<QDCPGameDefinitionData, QDCPGameStateSnapshot> {
    render(container: HTMLElement, gameState: Partial<QDCPGameStateSnapshot> | null, showSecrets: boolean): void {
        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? this.gameDefinition.title;

        const settings = document.createElement("div");
        const settingsLines = [
            `Punti per risposta corretta: ${gameState?.pointsForCorrectAnswer ?? this.gameDefinition.pointsForCorrectAnswer}`,
            `Tentativi per sezione: ${gameState?.limitTrialsPerSection ?? this.gameDefinition.limitTrialsPerSection}`,
            `Stop alla prima mano alzata: ${(gameState?.stopWhenFirstHandIsRaised ?? this.gameDefinition.stopWhenFirstHandRaised) ? "sì" : "no"}`,
        ];
        settings.textContent = settingsLines.join(" | ");

        const currentEntryLabel = document.createElement("div");
        const currentEntry = this.gameDefinition.hintsAndAnswers[gameState?.currentIndex ?? -1] ?? null;
        const displayedEntry = gameState?.displayContents ?? [];
        currentEntryLabel.textContent = currentEntry
            ? `Hint e risposta correnti: ${this.formatEntry(currentEntry, displayedEntry, showSecrets)}`
            : "Nessuna domanda corrente";

        container.replaceChildren(title, settings, currentEntryLabel);
    }

    private formatEntry(currentEntry: string[], displayedEntry: string[], showSecrets: boolean): string {
        let entry = "";
        const sep = ["", " | ", " | ", " | ", " = "];

        for (let i = 0; i < 5; i++) {
            const value = i in displayedEntry
                ? displayedEntry[i]
                : (showSecrets ? currentEntry[i] : "***");
            entry += sep[i]! + value;
        }

        return entry;
    }
}