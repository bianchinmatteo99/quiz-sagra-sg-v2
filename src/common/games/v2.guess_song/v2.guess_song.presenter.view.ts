import { GamePresenterStateView } from "../v2.base/base.presenter.view";
import { GuessSongDbData, GuessSongState, guessSongFields } from "./v2.guess_song.contracts";

/** Presenter-side renderer for Guess Song runtime information. */
export class GuessSongGamePresenterStateView extends GamePresenterStateView<typeof guessSongFields> {
    readonly fields = guessSongFields;

    /** Render settings summary plus current answer visibility for presenter mode. */
    render(container: HTMLElement, gameState: Partial<GuessSongDbData> | null, showSecrets: boolean): void {
        const others = this.parseFieldsToPresenterCurrentStateView(gameState);

        const currentSongIndex = gameState?.currentSongIndex ?? 0;
        const currentSong = this.gameDefinition.correctAnswers[currentSongIndex] ?? null;
        const song = currentSong
            ? "TITOLO CANZONE: " + (showSecrets || gameState?.state === GuessSongState.SHOWINGANSWER ? currentSong.toUpperCase() : "***")
            : "Nessuna canzone corrente";

        container.innerHTML = others + song;
    }
}