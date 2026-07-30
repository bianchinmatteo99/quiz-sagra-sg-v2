import { GamePresenterStateView } from "../games.presenter.base";
import { ZipGameDefinitionData, CatenaGameStateSnapshot as ZipGameStateSnapshot } from "./zip.contracts";

/**
 * Presenter-side renderer for Zip game state.
 *
 * Mirrors admin secret behavior:
 * - with secrets enabled, show full zip words from definition,
 * - with secrets disabled, show `displayWords` from runtime snapshot.
 */
export class ZipGamePresenterStateView extends GamePresenterStateView<ZipGameDefinitionData, ZipGameStateSnapshot> {
    render(container: HTMLElement, gameState: Partial<ZipGameStateSnapshot> | null, showSecrets: boolean): void {
        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? this.gameDefinition.title;

        const settings = document.createElement("div");
        const settingsLines = [
            `Punti per risposta corretta: ${gameState?.pointsForCorrectAnswer ?? this.gameDefinition.pointsForCorrectAnswer}`,
            `Tempo per risposta: ${gameState?.timeForAnswer ?? this.gameDefinition.timeForAnswer}s`,
            `Tentativi sullo stesso zip: ${(gameState?.canRetryForSameZip ?? this.gameDefinition.canRetryForSameZip) ? "consentiti" : "non consentiti"}`,
        ];
        settings.textContent = settingsLines.join(" | ");

        const zipLabel = document.createElement("div");
        const currentZip = gameState?.currentZip ?? -1;
        const currentZipWords = this.gameDefinition.zips[currentZip] ?? null;
        const maskedWords = gameState?.displayWords ?? [];

        if (!currentZipWords) {
            zipLabel.textContent = "Nessuno zip corrente";
        } else {
            const wordsToShow = showSecrets ? currentZipWords : maskedWords;
            zipLabel.textContent = `ZIP ${currentZip + 1}: ${wordsToShow.join(", ")}`;
        }

        container.replaceChildren(title, settings, zipLabel);
    }
}
