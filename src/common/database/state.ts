import { CancelHandle } from "../general.interfaces";
import { IDatabaseAdapter, AppState } from "./database.types";

// ---------------------------------------------------------------------------
// StateSource — observable value container
// ---------------------------------------------------------------------------

/**
 * An observable value container for a state node whose shape is
 * determined by a type discriminator.
 *
 * @typeParam S - The state shape. Must be an object with a `type: string`
 *   discriminator so that different question / game variants can be
 *   distinguished at runtime.
 */
export class StateSource<S extends { type: string }> {
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

// ---------------------------------------------------------------------------
// State — mounts StateSources for variant fields, delegates everything else
// ---------------------------------------------------------------------------

/**
 * DB path segments at which a {@link StateSource} may be mounted.
 * Only the `game` node and the `question/qoptions` node are variant
 * (their shape depends on the active game / question type).
 */
export type MountablePath = "game" | "question/qoptions";

/**
 * Manages the application state.
 *
 * - **Mountable paths** (`"game"`, `"question/qoptions"`): backed by a
 *   {@link StateSource} that acts as the single source of truth.
 *   Every emission is written to the DB; the DB is never read back
 *   into the source.
 * - **Everything else**: delegated directly to {@link IDatabaseAdapter}.
 */
export class State {
    private mountHandles: Map<MountablePath, CancelHandle> = new Map();

    constructor(protected db: IDatabaseAdapter) { }

    /**
     * Mounts a pre-built {@link StateSource} at `path`, registering a
     * one-way sync: source → DB.
     *
     * The source is the **single source of truth** — the DB is never
     * read back into it. The caller owns the source and drives it via
     * {@link StateSource.emit}.
     *
     * Mounting the same `path` again unmounts the previous source first.
     *
     * @param path   DB path — also used as the mount-point identifier
     * @param source An existing {@link StateSource} to wire up
     * @returns A {@link CancelHandle} that stops DB writes (equivalent to calling {@link unmountSource})
     */
    mountSource<S extends { type: string }>(
        path: MountablePath,
        source: StateSource<S>
    ): CancelHandle {
        this.unmountSource(path);

        // Source → DB (one-way)
        const off = source.onValue((value) => {
            this.db.set(path, value);
        });

        this.mountHandles.set(path, off);
        return () => this.unmountSource(path);
    }

    /**
     * Stops DB writes for the source mounted at `path` and removes it.
     */
    unmountSource(path: MountablePath): void {
        const off = this.mountHandles.get(path);
        if (off) {
            off();
            this.mountHandles.delete(path);
        }
    }

    // -----------------------------------------------------------------------
    // Direct DB delegation
    // -----------------------------------------------------------------------

    get<T>(path: string): Promise<T | null> {
        return this.db.get<T>(path);
    }

    onValue<T>(path: string, callback: (value: T | null) => void): CancelHandle {
        return this.db.onValue<T>(path, callback);
    }

    set<T>(path: string, value: T): Promise<void> {
        return this.db.set<T>(path, value);
    }

    update<T>(path: string, value: Partial<T>): Promise<void> {
        return this.db.update<T>(path, value);
    }

    remove(path: string): Promise<void> {
        return this.db.remove(path);
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    dispose(): void {
        this.mountHandles.forEach((off) => off());
        this.mountHandles.clear();
    }
}

// ---------------------------------------------------------------------------
// Example objects (compile-time checks)
// ---------------------------------------------------------------------------

export const initialState: AppState = {
    global: {
        gstate: "initial",
    },

    question: {
        timer: -1,
        qstate: "empty",

        qoptions: {
            type: "",
            public: {},
            private: {},
        },
    },

    game: {
        type: "",
    },

    users: {},

    answers: {},

    evaluations: {
        style: "",
    },
};

export const fullState: AppState = {
    global: {
        gstate: "asking",
    },

    question: {
        timer: 18,
        qstate: "active",

        qoptions: {
            type: "multiple_choice",

            public: {
                text: "Qual è la capitale della Francia?",
                options: [
                    "Madrid",
                    "Parigi",
                    "Berlino",
                    "Lisbona",
                ],
            },

            private: {
                correctIndex: 1,
            },
        },
    },

    game: {
        type: "classic",
        maxScore: 100,
    },

    users: {
        "uid_1": { name: "Alice", score: 30 },
        "uid_2": { name: "Bob", score: 20 },
        "uid_3": { name: "Carla", score: 10 },
    },

    answers: {
        "uid_1": 1,   // Parigi
        "uid_2": 2,   // Berlino
        "uid_3": 1,   // Parigi
    },

    evaluations: {
        style: "auto",
        "uid_1": { score: 10, correct: true },
        "uid_2": { score: 5, correct: false },
        "uid_3": { score: 10, correct: true },
    },
};