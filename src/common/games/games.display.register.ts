import { DecisionLeaf } from "../navigation/decisiontree";
import { Page } from "../navigation/pages";
import { CatenaGamePageChooser } from "./catena/catena.display.pagechooser";


export abstract class GamePageChooser<S> extends DecisionLeaf<S, Page> {
    name = "activegame"
    constructor() {
        super("");
    }
}

export function instantiatePageChooserForGame(name: string): GamePageChooser<any> {
    switch (name) {
        case "catena":
            return new CatenaGamePageChooser();
        default:
            throw new Error("Page provider for question " + name + " not registered.")
    }
}