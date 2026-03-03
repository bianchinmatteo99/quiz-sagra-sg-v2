// firebase.adapter.ts
import { getDatabase, ref, get, onValue, set, update, remove, off } from "firebase/database";
import { IDatabaseAdapter } from "./database.types";
import { CancelHandle } from "../general.interfaces";

export class FirebaseDatabaseAdapter implements IDatabaseAdapter {
    private db = getDatabase();

    async get<T>(path: string): Promise<T | null> {
        const snapshot = await get(ref(this.db, path));
        return snapshot.exists() ? (snapshot.val() as T) : null;
    }

    onValue<T>(path: string, callback: (value: T | null) => void): CancelHandle {
        const dbRef = ref(this.db, path);
        return onValue(dbRef, (snapshot) => {
            callback(snapshot.exists() ? (snapshot.val() as T) : null);
        });
    }

    async set<T>(path: string, value: T): Promise<void> {
        await set(ref(this.db, path), value);
    }

    async update<T>(path: string, value: Partial<T>): Promise<void> {
        await update(ref(this.db, path), value);
    }

    async remove(path: string): Promise<void> {
        await remove(ref(this.db, path));
    }
}