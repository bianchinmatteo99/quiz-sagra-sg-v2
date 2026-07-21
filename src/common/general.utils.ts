import { IDatabaseAdapter } from "./database/database.types";

/**
 * A function that, when called, removes an event listener.
 */
export type CancelHandle = () => void;

/**
 * Returns a promise that resolves after the specified delay.
 * @param ms - Number of milliseconds to wait before resolving.
 */
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Converts an HTML string into a typed HTMLElement instance.
 *
 * The markup is inserted into a template element and the first child
 * of the resulting content is returned.
 * @param markup - HTML string representing a single element.
 * @returns The first element parsed from the markup.
 */
export function toHtml<T extends HTMLElement>(markup: string): T {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return template.content.firstElementChild as T;
}

/**
 * Shared context for model instances that require database access and state
 * update notifications.
 */
export interface BaseModelContext {
    getDatabase(): IDatabaseAdapter;
    stateUpdated(remote: boolean): void;
}

/**
 * Encapsulates secret values with optional obfuscation for non-clear rendering.
 */
export class Secret<T> {
    constructor(private clearContent: T, private obfuscator: (clearValue: T) => T) { }

    /**
     * Reads the secret value.
     * @param clear - When true, returns the original content; otherwise returns obfuscated content.
     */
    read(clear?: boolean): T { return clear ? this.clearContent : this.obfuscator(this.clearContent) }

    /**
     * Serializes the secret for storage or transport.
     */
    toJSON(): any { return this.clearContent }
}

/**
 * Prints a Secret using a provided formatting function.
 */
export class SecretPrinter<T> {
    constructor(private secret: Secret<T>, private printer: (s: T) => string) { }

    /**
     * Returns the rendered secret value.
     * @param clear - Whether to render the secret in clear text.
     */
    print(clear: boolean): string { return this.printer(this.secret.read(clear)) }
}

/**
 * Base class for stateful models that load, save, and synchronize data with a database.
 *
 * Subclasses must define a DBPATH and implement JSON parsing / serialization.
 */
export abstract class BaseModel {
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
    protected readonly SECRETSPATH: string | null = null;
    protected readonly secrets: Map<string, Secret<any>> = new Map();
    abstract context: BaseModelContext;

    abstract parseFromJSON(data: any): boolean;
    abstract toJSON(): any;

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
            var data: any;
            if (typeof this.DBPATH == "string") {
                data = await this.context.getDatabase().get<any>(this.DBPATH);
            } else {
                for (const [key, path] of this.DBPATH.entries()) {
                    const ret = await this.context.getDatabase().get<any>(path)
                    if (ret !== null && ret !== undefined) data = { ...data, [key]: ret }
                }
            }
            if (data) {
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
                for (const [key, path] of this.DBPATH.entries()) {
                    if (key in json) await this.context.getDatabase().set(path, json[key]);
                }
            }
        } catch (error) {
            console.error('Error saving ' + this.DBPATH + ' to database:', error);
        }
    }

    /**
     * Registers a secret value and optionally persists it to the secrets path.
     */
    setSecret<T>(key: string, secret: Secret<T>) {
        this.secrets.set(key, secret)
        if (!!this.SECRETSPATH) {
            this.context.getDatabase().set("/secrets" + this.SECRETSPATH + `/${key}`, secret.toJSON())
        }
    }

    /**
     * Reads a registered secret value.
     * @param key - Secret identifier.
     * @param clear - Whether the returned value should be clear text.
     */
    getSecret<T>(key: string, clear: boolean): T | null {
        return this.secrets.get(key)?.read(clear)
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
        if (!!this.SECRETSPATH) {
            await this.context.getDatabase().remove("/secrets" + this.SECRETSPATH);
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
                    const parsed = this.parseFromJSON(typeof this.DBPATH == "string" ? data : { [key]: data });
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
