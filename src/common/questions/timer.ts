import { IDatabaseAdapter } from "../database/database.types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


export class Timer {
    readonly DBPATH = "/timer";
    readonly timerContainer = "timer-container";

    db: IDatabaseAdapter;
    seconds: number;
    private current: number | null;
    private listeners: ((t?: number) => void)[];

    constructor(seconds: number, db: IDatabaseAdapter) {
        this.seconds = seconds;
        this.current = null;
        this.db = db;
        this.listeners = [(t) => this.pushToUI(t)];
    }

    
    async start() {
        const end = Date.now() + this.seconds * 1000 + 50; // added 50 ms for ui delay
        this.pushToDB(end)
        let remaining = end - Date.now();
        let last : number|null = null;
        while (remaining > 0) {
            const current = Math.max(0, Math.ceil(remaining / 1000));
            if (current !== last) {
                last = current;
                this.current = current;
                this.listeners.forEach(fn => fn(current));
            }
            await delay(Math.min(50, remaining));
            remaining = end - Date.now();
        }
        this.pushToDB()
        this.current = null;
        this.listeners.forEach(fn => fn());
    }

    addListener(fn: (t?: number) => void) {
        this.listeners.push(fn);
    }

    private pushToDB(t?: number) {
        if (t === undefined) {
            this.db.set(this.DBPATH, -1);
        } else {
            this.db.set(this.DBPATH, this.current);
        }
    }

    private pushToUI(t?: number) {
        console.log("Timer " + t);
    }

}