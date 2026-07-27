import { CatenaGamePresenterStateView } from "./catena/catena.presenter.view";
import { CatenaDefinitionData } from "./catena/catena.contracts";
import { GamePresenterStateView } from "./games.presenter.base";
import { GameDefinitionData } from "./games.contracts";

export function instantiatePresenterStateViewForGame(definition: GameDefinitionData): GamePresenterStateView {
    switch (definition.kind) {
        case "catena":
            return new CatenaGamePresenterStateView(definition as CatenaDefinitionData);
        default:
            throw new Error("Presenter state view for game " + definition.kind + " not registered.");
    }
}