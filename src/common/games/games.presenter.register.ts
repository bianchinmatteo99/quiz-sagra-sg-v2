import { CatenaGamePresenterStateView } from "./catena/catena.presenter.view";
import { CatenaGameDefinitionData, CatenaGameRequiredData } from "./catena/catena.contracts";
import { GamePresenterStateView } from "./games.presenter.base";
import { AnyGameDefinitionData } from "./games.contracts";

export function instantiatePresenterStateViewForGame(definition: AnyGameDefinitionData): GamePresenterStateView {
    switch (definition.kind) {
        case CatenaGameRequiredData.kind:
            return new CatenaGamePresenterStateView(definition as CatenaGameDefinitionData);
        default:
            throw new Error("Presenter state view for game " + definition.kind + " not registered.");
    }
}