import { CatenaGamePresenterStateView } from "./catena/catena.presenter.view";
import { CatenaGameDefinitionData } from "./catena/catena.contracts";
import { GamePresenterStateView } from "./games.presenter.base";
import { GameDefinitionData } from "./games.contracts";

export function instantiatePresenterStateViewForGame(definition: GameDefinitionData): GamePresenterStateView {
    switch (definition.kind) {
        case "catena":
            return new CatenaGamePresenterStateView(definition as CatenaGameDefinitionData);
        default:
            throw new Error("Presenter state view for game " + definition.kind + " not registered.");
    }
}