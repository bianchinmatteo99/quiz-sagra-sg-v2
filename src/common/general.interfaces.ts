import { IDatabaseAdapter } from "./database/database.types.old";

/**
 * A function that, when called, removes an event listener.
 */
export type CancelHandle = () => void;

export interface dbProvider {
    getDatabase(): IDatabaseAdapter;
}

export abstract class BaseModel {
    abstract readonly DBPATH: string;
    abstract context: dbProvider;

    abstract parseFromJSON(data: any): boolean;
    abstract toJSON(): any;

    async loadFromDatabase(): Promise<boolean> {
        // Load quiz definition from the database and initialize state
        try {
            const data = await this.context.getDatabase().get<any>(this.DBPATH);
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
            await this.context.getDatabase().set(this.DBPATH, this.toJSON());
        } catch (error) {
            console.error('Error saving ' + this.DBPATH + ' to database:', error);
        }
    }
}