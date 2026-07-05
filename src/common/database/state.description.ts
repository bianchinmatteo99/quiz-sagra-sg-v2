import { IDatabaseAdapter } from "./database.types.old";
import { auth } from "../../firebase-init";
import { Auth } from "firebase/auth";
import { CancelHandle } from "../general.utils";


export type Role = "admin" | "player" | "presenter" | "viewer";

export type AccessMode = "read" | "write";

export class DbAuthRule {
    constructor(
        readonly pathPattern: RegExp,
        readonly modes: AccessMode[],
        readonly condition?: (auth: Auth) => boolean
    ) { }

    matches(path: string, mode: AccessMode, auth: Auth): boolean {
        if (!this.modes.includes(mode)) return false;
        if (!this.pathPattern.test(path)) return false;
        if (this.condition && !this.condition(auth)) return false;
        return true;
    }
}

const allowed: Record<string, DbAuthRule[]> = {
    admin: [
        new DbAuthRule(/^.+$/, ["read", "write"]) // full access
    ],

    player: [
        new DbAuthRule(/^global$/, ["read"]),
        new DbAuthRule(/^question\/public/, ["read"]),
        new DbAuthRule(/^users\/[^/]+\/score$/, ["read"]),
        new DbAuthRule(/^answers\/[^/]+$/, ["write"], auth =>
            auth?.currentUser?.uid !== undefined
        )
    ]
};

export class DbAuth {
    private readonly rulesByRole: Record<string, DbAuthRule[]> = allowed;

    constructor(
        private readonly role: string,
        private readonly auth: Auth
    ) { }

    canAccess(path: string, mode: AccessMode): boolean {
        const rules = this.rulesByRole[this.role] ?? [];
        return rules.some(rule => rule.matches(path, mode, this.auth));
    }
}



// const dbAuth = new DbAuth("player", auth);

export class Updater {
    private closed: boolean = false;
    private registered: Record<string, any> = {};
    private readonly flushPromise: Promise<void>;
    private readonly resolvePromise: (value: void | PromiseLike<void>) => void;

    constructor(
        private readonly adapter: IDatabaseAdapter
    ) {
        const { promise, resolve } = Promise.withResolvers<void>();
        this.flushPromise = promise;
        this.resolvePromise = resolve;
    }

    register(fullPath: string, value: any) {
        this.registered[fullPath] = value;
    }

    getPromise() {
        return this.flushPromise;
    }

    async flush() {
        if (this.closed) {
            console.log("Error: updater already flushed.")
            throw new Error("Error: updater already flushed.")
        }
        if (Object.keys(this.registered).length === 0) {
            console.log("Error: updater has no registered updates.")
            return;
        }
        const p = this.adapter.update("", this.registered);
        this.registered = {};
        this.closed = true;
        this.resolvePromise(p);
    }
}

export class StateSource<S> {
    protected state: S;
    protected listeners: Set<(value: S) => void> = new Set();

    constructor(initialState: S) {
        this.state = initialState;
    }

    /** Returns the last emitted value. */
    getState(): S {
        return this.state;
    }

    /**
     * Subscribe to value changes. The callback is called immediately
     * (asynchronously via microtask) with the current value, and then on
     * every subsequent emit.
     *
     * @returns A {@link CancelHandle} that removes the subscription.
     */
    onValue(callback: (value: S) => void): CancelHandle {
        let active = true;

        const cancel: CancelHandle = () => {
            if (!active) return;
            active = false;
            this.listeners.delete(callback);
        };

        this.listeners.add(callback);

        queueMicrotask(() => {
            if (active) {
                callback(this.state);
            }
        });

        return cancel;
    }

    /** Push a new value to all subscribers. */
    emit(value: S): void {
        this.state = value;
        for (const listener of this.listeners) {
            listener(value);
        }
    }
}

export abstract class StateNode {
    protected constructor(
        protected readonly adapter: IDatabaseAdapter,
        protected readonly dbAuth: DbAuth,
        protected readonly parentPath: string | null
    ) { }

    protected abstract readonly key: string;

    protected abstract readonly childMap?: Map<string, StateNode>;
    protected abstract readonly otherPropsDefault: object;

    protected get path(): string {
        if (!this.parentPath || this.parentPath === "")
            return this.key;
        return `${this.parentPath}/${this.key}`;
    }
    protected absPathOf(relativePath: string): string {
        return `${this.path}/${relativePath}`;
    }

    protected assertAccess(mode: AccessMode) {
        if (!this.dbAuth.canAccess(this.path, mode)) {
            throw new Error(
                `Access denied (${mode}) on path ${this.path}`
            );
        }
    }

    protected setDefault(updater?: Updater) {
        const shouldFlush = !updater;
        updater ??= this.getUpdater();
        for (const child of this.childMap?.values() ?? []) {
            child.setDefault(updater);
        }
        for (const [key, value] of Object.entries(this.otherPropsDefault)) {
            updater.register(this.absPathOf(key), value);
        }
        if (shouldFlush) {
            updater.flush();
        }
    }

    protected getUpdater() {
        return new Updater(this.adapter);
    }

    protected startUpdate(block: (updater: Updater) => void) {
        const updater = this.getUpdater();
        block(updater);
        updater.flush();
    }

    protected onValue(callback: (value: any) => void): CancelHandle {
        throw new Error("Method not implemented.");
    }

    protected update(next: Partial<typeof this.otherPropsDefault>, updater?: Updater): Promise<void> {
        this.assertAccess("write");
        if (updater) {
            for (const [key, value] of Object.entries(next)) {
                updater.register(this.absPathOf(key), value);
            }
            return updater.getPromise();
        } else {
            return this.adapter.update(this.path, next);
        }
    }
}

export type GlobalGameState =
    | "initial"
    | "inactive"
    | "waiting"
    | "asking"
    | "showing_results";

export class GlobalStateNode extends StateNode {
    protected readonly key: string = "global";
    protected readonly childMap?: Map<string, StateNode> = undefined;
    protected readonly otherPropsDefault = {
        gstate: "initial" as GlobalGameState,
    };

    onValue(callback: (value: typeof this.otherPropsDefault | null) => void): CancelHandle {
        this.assertAccess("read");
        return this.adapter.onValue(this.path, callback);
    }
}

export type QuestionState = "empty" | "ready" | "active" | "closed";
export type QuestionOptions = any; // TODO: replace with type union

export class QuestionStateNode extends StateNode {
    protected readonly key: string = "question";
    protected readonly childMap?: Map<string, StateNode> = undefined;
    protected readonly otherPropsDefault = {
        timer: -1,
        qstate: "empty" as QuestionState,
        qoptions: {
            type: "",
            public: {},
            private: {},
        } as QuestionOptions,
    };

    private qoptionsSource: StateSource<QuestionOptions> | null = null;
    private qoptionsOff: CancelHandle | null = null;

    mountSource(source: StateSource<QuestionOptions>): CancelHandle {
        this.assertAccess("write");
        this.unmountSource();

        // Source → DB (one-way)
        const off = source.onValue((value) => {
            this.adapter.set(this.absPathOf("qoptions"), value);
        });

        this.qoptionsSource = source;
        this.qoptionsOff = off;
        return () => this.unmountSource();
    }

    /**
     * Stops DB writes for the source mounted at `path` and removes it.
     */
    unmountSource(): void {
        this.assertAccess("write");
        const off = this.qoptionsOff;
        if (off) {
            off();
            this.qoptionsOff = null;
            this.qoptionsSource = null;
        }
    }

}