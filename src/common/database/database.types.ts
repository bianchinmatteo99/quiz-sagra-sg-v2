import { CancelHandle } from "../general.utils";

export interface IDatabaseAdapter {
    get<T>(path: string): Promise<T | null>;
    onValue<T>(path: string, callback: (value: T | null) => void): CancelHandle;
    set<T>(path: string, value: T): Promise<void>;
    update<T>(path: string, value: Partial<T>): Promise<void>;
    remove(path: string): Promise<void>;
}