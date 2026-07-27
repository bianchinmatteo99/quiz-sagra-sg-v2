import { ReazioneCatenaGamePresenterStateView } from "./catena/catena.presenter.view";
import { GamePresenterStateView } from "./games.presenter.base";

export function instantiatePresenterStateViewForGame(kind: string): GamePresenterStateView {
    switch (kind) {
        case "catena":
            return new ReazioneCatenaGamePresenterStateView();
        default:
            throw new Error("Presenter state view for game " + kind + " not registered.");
    }
}