import { IDatabaseAdapter } from "../database/database.types";
import { delay } from "../general.utils";

/**
 * Countdown timer that broadcasts remaining seconds locally and persists the
 * timer state to a shared database path.
 *
 * Intended usage:
 * 1. Construct with a duration and a database adapter.
 * 2. Register listeners with `addListener()` to receive updates.
 * 3. Call `start()` to begin the countdown.
 *
 * The timer writes the end time in millis to `/state/timerend` when
 * started and writes `-1` once the countdown has finished.
 */
export class Timer {
    /** Shared database path storing timer end timestamp or inactive sentinel. */
    readonly DBPATH = "/state/timerend";

    /** Database adapter used to publish timer state to realtime clients. */
    db: IDatabaseAdapter;
    /** Configured countdown duration in seconds. */
    seconds: number;
    /** Last emitted remaining seconds, or null when timer is inactive. */
    private current: number | null;
    /** Local subscribers notified on each visible second transition. */
    private listeners: ((t?: number) => void)[];

    /**
     * @param seconds Countdown duration in seconds.
     * @param db Database adapter used to persist timer state.
     */
    constructor(seconds: number, db: IDatabaseAdapter) {
        this.seconds = seconds;
        this.current = null;
        this.db = db;
        this.listeners = [];
    }

    /**
     * The most recent remaining second value, or null when the timer is inactive.
     */
    get currentTime() {
        return this.current;
    }

    /**
     * Starts the countdown and notifies registered listeners each second.
     *
     * Each second boundary publishes the remaining seconds to listeners.
     * When the timer completes, it writes `-1` to the shared database and
     * calls listeners with no argument.
     *
     * The countdown publishes an absolute end timestamp to `/state/timerend` so
     * remote clients can compute the remaining time independently.
     *
     * @returns Resolves when the countdown reaches zero and final notifications
     * are dispatched.
     */
    async start() {
        const end = Date.now() + this.seconds * 1000 + 50; // added 50 ms for ui delay
        this.pushToDB(end)
        let remaining = end - Date.now();
        let last : number|null = null;
        while (remaining > 0) {
            const current = Math.min(Math.max(0, Math.ceil(remaining / 1000)), this.seconds);
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

    /**
     * Registers a callback to receive timer updates.
     *
     * @param fn Called with the remaining seconds while running, or without an
     *           argument when the countdown is finished.
     */
    addListener(fn: (t?: number) => void) {
        this.listeners.push(fn);
    }

    /**
     * Persists timer state to the shared database.
     *
     * @param t Absolute end timestamp in milliseconds. When omitted, writes
     * `-1` to mark the timer as inactive.
     */
    private pushToDB(t?: number) {
        if (t === undefined) {
            this.db.set(this.DBPATH, -1);
        } else {
            this.db.set(this.DBPATH, t);
        }
    }
}