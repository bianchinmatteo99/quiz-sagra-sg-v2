import { DecisionLeaf } from "../navigation/decisiontree";
import { Page } from "../navigation/pages";

/**
 * Shared base abstraction for display-side game page choosers.
 *
 * Concrete game display modules extend this leaf node to translate a specific
 * game snapshot into the page that should be rendered on the audience display.
 * Instances are created through `games.display.register.ts` and consumed by the
 * display decision tree orchestrator.
 *
 * @typeParam S Snapshot shape consumed by the chooser (typically `/state/game`).
 */
export abstract class GamePageChooser<S> extends DecisionLeaf<S, Page> {
    /** Stable node key used by display decision tree path tracing. */
    name = "activegame"

    /**
     * Create a terminal decision node for a single game family.
     */
    constructor() {
        super("");
    }
}