import { CancelHandle } from "../general.utils";

/**
 * Abstract database contract used to decouple application logic from
 * specific database implementations.
 */
export interface IDatabaseAdapter {
    /**
     * Reads a value from the database at the given path.
     * @param path - The database path to read from.
     * @returns The value at the path, or null when no data exists.
     */
    get<T>(path: string): Promise<T | null>;

    /**
     * Subscribes to value changes at the given path.
     * @param path - The database path to observe.
     * @param callback - Receives the latest value or null when data is missing.
     * @returns A cancel handle that removes the listener when invoked.
     */
    onValue<T>(path: string, callback: (value: T | null) => void): CancelHandle;

    /**
     * Writes a value to the specified database path.
     * @param path - The database path to write to.
     * @param value - The payload to store.
     */
    set<T>(path: string, value: T): Promise<void>;

    /**
     * Updates an existing object at the given path using a partial payload.
     * @param path - The database path to update.
     * @param value - Partial object containing updated properties.
     */
    update<T>(path: string, value: Partial<T>): Promise<void>;

    /**
     * Removes the value at the specified database path.
     * @param path - The database path to delete.
     */
    remove(path: string): Promise<void>;
}