import { CatenaGameRequiredData } from "./catena/catena.contracts";
import { CatenaGamePageChooser } from "./catena/catena.display.view";
import { GuessSongGameRequiredData } from "./guess_song/guess_song.contracts";
import { GuessSongGamePageChooser } from "./guess_song/guess_song.display.view";
import { GamePageChooser } from "./games.display.base";
import { ZipGameRequiredData } from "./zip/zip.contracts";
import { ZipGamePageChooser } from "./zip/zip.display.view";

/**
 * Create the display-side page chooser registered for a game kind.
 *
 * This registry is used by `GamesPageChooserDelegator` to lazily instantiate
 * the chooser that converts live game snapshots into concrete display pages.
 *
 * @param kind Game discriminator read from display state.
 * @returns Concrete chooser able to render the requested game kind.
 * @throws Error When no chooser is registered for `kind`.
 */
export function instantiatePageChooserForGame(kind: string): GamePageChooser<any> {
    switch (kind) {
        case CatenaGameRequiredData.kind:
            return new CatenaGamePageChooser();
        case GuessSongGameRequiredData.kind:
            return new GuessSongGamePageChooser();
        case ZipGameRequiredData.kind:
            return new ZipGamePageChooser();
        default:
            throw new Error("Page provider for game " + kind + " not registered.")
    }
}