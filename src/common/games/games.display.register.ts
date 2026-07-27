import { CatenaGamePageChooser } from "./catena/catena.display.pagechooser";
import { GamePageChooser } from "./games.display.base";

export function instantiatePageChooserForGame(kind: string): GamePageChooser<any> {
    switch (kind) {
        case "catena":
            return new CatenaGamePageChooser();
        default:
            throw new Error("Page provider for game " + kind + " not registered.")
    }
}