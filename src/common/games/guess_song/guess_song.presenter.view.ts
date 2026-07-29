import { GamePresenterStateView } from "../games.presenter.base";
import { GuessSongGameDefinitionData, GuessSongGameStateSnapshot, GuessSongState } from "./guess_song.contracts";

/**
 * Presenter-side renderer for Guess Song game state.
 *
 * Shows the current song answer, while respecting the secret visibility toggle.
 */
export class GuessSongGamePresenterStateView extends GamePresenterStateView<GuessSongGameDefinitionData, GuessSongGameStateSnapshot> {
    /**
     * Render the Guess Song presenter panel.
     *
     * @param container Target element to fully replace with rendered content.
     * @param gameState Runtime snapshot from `/state/game`.
     * @param showSecrets Whether unrevealed song content can be shown in clear text.
     */
    render(container: HTMLElement, gameState: Partial<GuessSongGameStateSnapshot> | null, showSecrets: boolean): void {
        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? this.gameDefinition.title;

        const settings = document.createElement("div");
        const settingsLines = [
            `Punti per risposta corretta: ${gameState?.pointsForCorrectAnswer ?? this.gameDefinition.pointsForCorrectAnswer}`,
            `Tentativi per canzone: ${gameState?.limitTrialsPerSong ?? this.gameDefinition.limitTrialsPerSong}`,
            `Stop alla prima mano alzata: ${(gameState?.stopWhenFirstHandIsRaised ?? this.gameDefinition.stopWhenFirstHandRaised) ? "sì" : "no"}`,
        ];
        settings.textContent = settingsLines.join(" | ");

        const currentSongLabel = document.createElement("div");
        const currentSongIndex = gameState?.currentSongIndex ?? 0;
        const currentSong = this.gameDefinition.correctAnswers[currentSongIndex] ?? null;
        currentSongLabel.textContent = currentSong
            ? "TITOLO CANZONE IN CORSO: " + (showSecrets || gameState?.state===GuessSongState.SHOWINGANSWER ? currentSong.toUpperCase() : "***")
            : "Nessuna canzone corrente";

        container.replaceChildren(title, settings, currentSongLabel);
    }
}
