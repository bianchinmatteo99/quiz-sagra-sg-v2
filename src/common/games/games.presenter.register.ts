import { CatenaGamePresenterStateView } from "./catena/catena.presenter.view";
import { CatenaGameDefinitionData, CatenaGameRequiredData } from "./catena/catena.contracts";
import { GamePresenterStateView } from "./games.presenter.base";
import { AnyGameDefinitionData } from "./games.contracts";
import { GuessSongGameDefinitionData, GuessSongGameRequiredData } from "./guess_song/guess_song.contracts";
import { GuessSongGamePresenterStateView } from "./guess_song/guess_song.presenter.view";

export function instantiatePresenterStateViewForGame(definition: AnyGameDefinitionData): GamePresenterStateView {
    switch (definition.kind) {
        case CatenaGameRequiredData.kind:
            return new CatenaGamePresenterStateView(definition as CatenaGameDefinitionData);
        case GuessSongGameRequiredData.kind:
            return new GuessSongGamePresenterStateView(definition as GuessSongGameDefinitionData);
        default:
            throw new Error("Presenter state view for game " + definition.kind + " not registered.");
    }
}