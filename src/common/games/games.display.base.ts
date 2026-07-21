import { DecisionLeaf } from "../navigation/decisiontree";
import { Page } from "../navigation/pages";


export abstract class GamePageChooser<S> extends DecisionLeaf<S, Page> {
    name = "activegame"
    constructor() {
        super("");
    }
}