import { ReazioneCatenaGamePresenterStateView } from "./catena/catena.presenter.view";
import { GamePresenterStateView } from "./games.presenter.base";

export function instantiatePresenterStateViewForGame(name: string): GamePresenterStateView {
    switch (name) {
        case "catena":
            return new ReazioneCatenaGamePresenterStateView();
        default:
            throw new Error("Presenter state view for game " + name + " not registered.");
    }
}