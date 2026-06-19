import { IDatabaseAdapter } from "./database/database.types.old";

/**
 * A function that, when called, removes an event listener.
 */
export type CancelHandle = () => void;

/* type WithDatabaseContext = {
  context: { getDatabase: () => IDatabaseAdapter };
};

export function withDatabase<T extends WithDatabaseContext>(obj: T) {
  return Object.assign(obj, {
    getDatabase() {
      return obj.context.getDatabase();
    },
  });
} */

export interface BaseModelContext {
    getDatabase(): IDatabaseAdapter;
    stateUpdated(remote : boolean): void;
}

export abstract class BaseModel {
    abstract readonly DBPATH: string | Map<string, string>; // object key -> destination db
    abstract context: BaseModelContext;

    abstract parseFromJSON(data: any): boolean;
    abstract toJSON(): any;

    async loadFromDatabase(): Promise<boolean> {
        // Load quiz definition from the database and initialize state
        try {
            var data: any;
            if(typeof this.DBPATH == "string"){
                data = await this.context.getDatabase().get<any>(this.DBPATH);
            } else {
                for(const [key, path] of this.DBPATH.entries()){
                    const ret = await this.context.getDatabase().get<any>(path)
                    if(ret !== null && ret !== undefined) data = {...data, [key]: ret}
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
            if(typeof this.DBPATH == "string"){
                await this.context.getDatabase().set(this.DBPATH, json);
            } else {
                for(const [key, path] of this.DBPATH.entries()){
                    if (key in json) await this.context.getDatabase().set(path, json[key]);
                }
            }       
        } catch (error) {
            console.error('Error saving ' + this.DBPATH + ' to database:', error);
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

    async setupTwoWayBinding(only?: string[]): Promise<CancelHandle[]> {
        await this.restoreOrSave();

        if(typeof this.DBPATH == "string"){
            return [this.context.getDatabase().onValue<any>(this.DBPATH, (data) => {
                if (data !== null && data !== undefined) {
                    const parsed = this.parseFromJSON(data);
                    if (parsed) {
                        this.context.stateUpdated(true);
                    }
                }
            })];
        } else {
            const o = only ?? this.DBPATH.keys().toArray();
            return this.DBPATH.entries().toArray().filter(([key, _])=>o.includes(key)).map(([key, path])=>
                this.context.getDatabase().onValue<any>(path, (data) => {
                    if (data !== null && data !== undefined) {
                        const parsed = this.parseFromJSON({[key]: data});
                        if (parsed) {
                            this.context.stateUpdated(true);
                        }
                    }
                })
            )
        }
    }
}