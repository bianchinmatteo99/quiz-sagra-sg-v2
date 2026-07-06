// firebase.adapter.ts
import { getDatabase, ref, get, onValue, set, update, remove, off } from "firebase/database";
import { IDatabaseAdapter } from "./database.types";
import { CancelHandle } from "../general.utils";

/**
 * Firebase implementation of the database adapter contract.
 *
 * Uses the Firebase Realtime Database client APIs to perform standard
 * CRUD operations and subscribe to live value updates.
 */
export class FirebaseDatabaseAdapter implements IDatabaseAdapter {
    private db = getDatabase();

    /**
     * Reads a snapshot from Firebase and returns its deserialized value.
     */
    async get<T>(path: string): Promise<T | null> {
        const snapshot = await get(ref(this.db, path));
        return snapshot.exists() ? (snapshot.val() as T) : null;
    }

    /**
     * Listens for realtime updates at the specified path.
     * @returns A Firebase cancel handle that detaches the listener.
     */
    onValue<T>(path: string, callback: (value: T | null) => void): CancelHandle {
        const dbRef = ref(this.db, path);
        return onValue(dbRef, (snapshot) => {
            callback(snapshot.exists() ? (snapshot.val() as T) : null);
        });
    }

    /**
     * Writes a value to the Firebase database at the target path.
     */
    async set<T>(path: string, value: T): Promise<void> {
        await set(ref(this.db, path), value);
    }

    /**
     * Applies a partial update to the object stored at the given path.
     */
    async update<T>(path: string, value: Partial<T>): Promise<void> {
        await update(ref(this.db, path), value);
    }

    /**
     * Removes the data stored at the specified path.
     */
    async remove(path: string): Promise<void> {
        await remove(ref(this.db, path));
    }
}