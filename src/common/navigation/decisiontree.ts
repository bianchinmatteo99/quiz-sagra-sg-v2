
/**
 * Small state-machine abstraction used to map application state to a concrete
 * result such as the next page to display.
 *
 * The decision tree is primarily used by the user and display entry points to
 * translate reactive state updates into the correct view without embedding that
 * branching logic directly in the UI layers.
 *
 * @template S The state shape consumed by the decision logic.
 * @template T The value produced by the decision, typically a page instance.
 */
export abstract class DecisionNode<S, T> {
    /**
     * The path of this node in the decision tree, built from the parent chain.
     */
    parentPath: string;
    /**
     * The node name used when composing the full path.
     */
    abstract name: string;
    /**
     * Child decision nodes keyed by the branch name that selects them.
     */
    abstract children: Record<string, DecisionNode<S, T>>;
    /**
     * Produces the decision result for a given state.
     */
    abstract decide(state: S): T;

    /**
     * Resets any temporary state kept by the node.
     *
     * Subclasses override this to clear branch-specific flags such as
     * "already answered" or "already logged in" when the decision tree moves
     * to another branch.
     */
    clear() { }

    constructor(parentPath: string) {
        this.parentPath = parentPath;
    }

    /**
     * Returns the full path for debugging and tracing the chosen branch.
     */
    get path() {
        return this.parentPath + ">" + this.name;
    }

    /**
     * Delegates to a child branch while clearing the temporary state of sibling
     * branches so they do not leak their prior decision state into later renders.
     */
    delegateDecision(child: string, state: S): T {
        Object.entries(this.children).filter(([s, dt]) => s != child).forEach(([s, dt]) => dt.clearSubTree());
        return this.children[child].decide(state);
    }

    /**
     * Recursively clears the temporary state of this node and all descendants.
     */
    clearSubTree() {
        Object.values(this.children).forEach(dn => dn.clearSubTree());
        this.clear();
    }
}

/**
 * A terminal node in the decision tree.
 *
 * Leaves are used for the last step of branching, such as choosing the concrete
 * page to render for a specific state. They intentionally do not delegate to
 * further children.
 *
 * @template S The state shape consumed by the decision logic.
 * @template T The value produced by the decision, typically a page instance.
 */
export abstract class DecisionLeaf<S, T> extends DecisionNode<S, T> {
    children: Record<string, DecisionNode<S, T>> = {};

    /**
     * Leaves cannot forward the decision to another child node.
     */
    delegateDecision(child: string, state: S): T {
        throw new Error("Leaf cannot delegate decisions");
    }

    /**
     * Clears only this leaf, because it has no descendants to traverse.
     */
    clearSubTree(): void {
        this.clear();
    }
}
