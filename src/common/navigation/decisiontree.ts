
export abstract class DecisionNode<S, T> {
    parentPath: string;
    abstract name: string;
    abstract children: Record<string, DecisionNode<S, T>>;
    abstract decide(state: S): T;
    clear() { }

    constructor(parentPath: string) {
        this.parentPath = parentPath;
    }

    get path() {
        return this.parentPath + ">" + this.name;
    }

    delegateDecision(child: string, state: S): T {
        Object.entries(this.children).filter(([s, dt]) => s != child).forEach(([s, dt]) => dt.clearSubTree());
        return this.children[child].decide(state);
    }

    // called when a parent delegates decision to other child, so that the temporary internal state of previous decision nodes can be cleared
    clearSubTree() {
        Object.values(this.children).forEach(dn => dn.clearSubTree());
        this.clear();
    }
}

export abstract class DecisionLeaf<S, T> extends DecisionNode<S, T> {
    children: Record<string, DecisionNode<S, T>> = {};
    delegateDecision(child: string, state: S): T {
        throw new Error("Leaf cannot delegate decisions");
    }
    clearSubTree(): void {
        this.clear();
    }
}
