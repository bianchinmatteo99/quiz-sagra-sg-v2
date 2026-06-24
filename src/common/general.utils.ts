import { IDatabaseAdapter } from "./database/database.types.old";

/**
 * A function that, when called, removes an event listener.
 */
export type CancelHandle = () => void;


export interface BaseModelContext {
    getDatabase(): IDatabaseAdapter;
    stateUpdated(remote: boolean): void;
}

export class Secret<T> {
    constructor(private clearContent: T, private obfuscator: (clear: T) => T) { }
    read(clear : boolean) : T { return clear ? this.clearContent : this.obfuscator(this.clearContent) }
    toJSON(): any { return this.clearContent }
}
export class SecretPrinter<T>{
    constructor(private secret: Secret<T>, private printer: (s: T)=>string) { }
    print(clear : boolean): string { return this.printer(this.secret.read(clear)) }
}

export abstract class BaseModel {
    abstract readonly DBPATH: string | Map<string, string>; // object key -> destination db
    protected readonly SECRETSPATH: string | null = null;
    protected readonly secrets: Map<string, Secret<any>> = new Map();
    abstract context: BaseModelContext;

    abstract parseFromJSON(data: any): boolean;
    abstract toJSON(): any;

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

    setSecret<T>(key: string, secret: Secret<T>){
        this.secrets.set(key, secret)
        if(!!this.SECRETSPATH){
            this.context.getDatabase().set("/secrets" + this.SECRETSPATH + `/${key}`, secret.toJSON())
        }
    }
    getSecret<T>(key: string, clear: boolean): T|null{
        return this.secrets.get(key)?.read(clear)
    }

    async clearDatabase() {
        this.removeBinding();
        if (typeof this.DBPATH == "string") {
            await this.context.getDatabase().remove(this.DBPATH);
        } else {
            this.DBPATH.forEach((path => this.context.getDatabase().remove(path)));
        }
        if(!!this.SECRETSPATH){
            await this.context.getDatabase().remove("/secrets" + this.SECRETSPATH);
        }
    }

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

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


export function toHtml<T extends HTMLElement>(markup: string): T {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return template.content.firstElementChild as T;
}

