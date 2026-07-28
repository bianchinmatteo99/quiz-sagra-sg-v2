import { IDatabaseAdapter } from "./database/database.types";
import { CancelHandle } from "./general.utils";

/**
 * Shared context for model instances that require database access and state
 * update notifications.
 */
export interface BaseModelContext {
    getDatabase(): IDatabaseAdapter;
    stateUpdated(remote: boolean): void;
}

/**
 * Base class for stateful models that load, save, and synchronize data with a database.
 *
 * Subclasses must define a DBPATH and implement JSON parsing / serialization.
 */
export abstract class BaseModel<TSnapshot extends object> {
    /**
     * Database path configuration for this model.
     *
     * - When `DBPATH` is a string, the model is stored and loaded from a single
     *   Firebase location.
     * - When `DBPATH` is a `Map<string, string>`, each key represents a property
     *   bucket and maps to its own database path. In this mode, `loadFromDatabase`
     *   merges values from multiple paths into a single object before parsing,
     *   and `saveToDatabase` writes each keyed value to its associated path.
     */
    abstract readonly DBPATH: string | Map<string, string>;
    abstract context: BaseModelContext;

    abstract parseFromJSON(data: Partial<TSnapshot>): boolean;
    abstract toJSON(): TSnapshot;

    /**
     * Loads persisted data from the database and initializes model state.
     *
     * For a string `DBPATH`, the model expects a single persisted object at that
     * path. For a `Map<string, string>`, the model reads each mapped path,
     * combining the returned values into a single object keyed by map entry.
     * @returns True when data was successfully loaded and parsed.
     */
    async loadFromDatabase(): Promise<boolean> {
        // Load quiz definition from the database and initialize state
        try {
            let data: Partial<TSnapshot> | undefined;
            if (typeof this.DBPATH == "string") {
                data = await this.context.getDatabase().get<Partial<TSnapshot>>(this.DBPATH) ?? undefined;
            } else {
                for (const [key, path] of this.DBPATH.entries()) {
                    const ret = await this.context.getDatabase().get<unknown>(path)
                    if (ret !== null && ret !== undefined) {
                        data = { ...(data ?? {}), [key]: ret } as Partial<TSnapshot>;
                    }
                }
            }
            if (data !== undefined) {
                return this.parseFromJSON(data);
            }
        } catch (error) {
            console.error('Error loading ' + this.DBPATH + ' from database:', error);
        }
        return false;
    }

    /**
     * Persists the current model state to the database.
     *
     * When `DBPATH` is a string, the full model JSON is written to that path.
     * When `DBPATH` is a `Map<string, string>`, only matching keys from the model
     * JSON are written to their corresponding paths.
     */
    async saveToDatabase(): Promise<void> {
        // Save the current quiz state to the database
        try {
            const json = this.toJSON();
            if (typeof this.DBPATH == "string") {
                await this.context.getDatabase().set(this.DBPATH, json);
            } else {
                const jsonRecord = json as Record<string, unknown>;
                for (const [key, path] of this.DBPATH.entries()) {
                    if (key in jsonRecord) {
                        await this.context.getDatabase().set(path, jsonRecord[key]);
                    }
                }
            }
        } catch (error) {
            console.error('Error saving ' + this.DBPATH + ' to database:', error);
        }
    }

    /**
     * Removes persisted values for this model and clears any active bindings.
     *
     * For string `DBPATH`, the single path is removed. For a `Map<string, string>`,
     * all mapped paths are removed in parallel.
     */
    async clearDatabase() {
        this.removeBinding();
        if (typeof this.DBPATH == "string") {
            await this.context.getDatabase().remove(this.DBPATH);
        } else {
            await Promise.all(
                Array.from(this.DBPATH.values()).map(path =>
                    this.context.getDatabase().remove(path)
                )
            );
        }
    }

    /**
     * Ensures model state is restored from the database or saved if no persisted state exists.
     */
    async restoreOrSave(): Promise<void> {
        try {
            const restore = await this.loadFromDatabase();
            if (!restore) {
                await this.saveToDatabase();
            }
        } catch (error) {
            console.error('Error restoring or saving ' + this.DBPATH + ' from database:', error);
        }
    }

    private _bindingCancel: Map<string, CancelHandle> = new Map();

    /**
     * Sets up realtime database listeners for the model's data paths.
     *
     * For string `DBPATH`, a single listener is attached to that path. For a
     * `Map<string, string>`, listeners are attached for each mapped path and
     * incoming values are parsed into an object keyed by map entry.
     * @param only - Optional subset of keys to bind.
     * @returns Cancel handles for all created listeners.
     */
    setupTwoWayBinding(only?: string[]): CancelHandle[] {
        const paths = typeof this.DBPATH == "string" ? new Map([[this.DBPATH, this.DBPATH]]) : this.DBPATH;
        if (!only) {
            only = paths.keys().toArray();
        }
        this.removeBinding(only);
        const ret = [];
        for (const [key, path] of paths.entries()) {
            if (!only.includes(key)) continue;
            const c = this.context.getDatabase().onValue<any>(path, (data) => {
                if (data !== null && data !== undefined) {
                    const parsed = this.parseFromJSON(typeof this.DBPATH == "string" ? data as Partial<TSnapshot> : { [key]: data } as Partial<TSnapshot>);
                    if (parsed) {
                        this.context.stateUpdated(true);
                    }
                }
            });
            this._bindingCancel.set(key, c);
            ret.push(c);
        }

        return ret;
    }

    /**
     * Cancels active realtime bindings for the specified keys.
     * @param only - Optional subset of bindings to remove.
     */
    removeBinding(only?: string[]) {
        only = only ?? this._bindingCancel.keys().toArray();
        for (const key of only) {
            const c = this._bindingCancel.get(key)
            if (!!c) {
                c();
                this._bindingCancel.delete(key);
            }
        }
    }
}

/**
 * Runs checks to resume or clean states and decide whether
 *  - state restore is complete: a call to endResume prevents other checkpoints to run
 *  - some block code in the caller should be run (this is the meaning of the return boolean - if true means 'quiz/game flow should run normally')
 */
export type CheckPointAction = (endResume : ()=>void)=>boolean

export class ResumeCheckpoints {
    checkpoints : Record<string, CheckPointAction>
    resumeEnded : boolean

    constructor(checkpoints? : Record<string, CheckPointAction>){
        if(!checkpoints){
            this.resumeEnded = true;
            this.checkpoints = {}
        } else {
            this.resumeEnded = false;
            this.checkpoints = checkpoints
        }
    }

    reachedCheckPoint(key: string): boolean {
        if(this.resumeEnded) return true;

        return this.checkpoints[key]?.(()=>{
            this.resumeEnded = true;
        }) ?? false;
    }
}