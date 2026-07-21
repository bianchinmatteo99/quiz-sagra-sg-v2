import { CatenaGamePageChooser } from "./catena/catena.display.pagechooser";
import { GamePageChooser } from "./games.display.base";

export function instantiatePageChooserForGame(name: string): GamePageChooser<any> {
    switch (name) {
        case "catena":
            return new CatenaGamePageChooser();
        default:
            throw new Error("Page provider for question " + name + " not registered.")
    }
}