import { IDatabaseAdapter } from "../database/database.types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


export class Timer {
    readonly DBPATH = "/timer";
    readonly timerContainer = "timer-container";

    db: IDatabaseAdapter;
    seconds: number;
    private current: number | null;
    private listeners: ((t?: number)=>void)[];

    constructor(seconds: number, db: IDatabaseAdapter) {
        this.seconds = seconds;
        this.current = null;
        this.db = db;
        this.listeners = [(t)=>this.pushToDB(t), (t)=>this.pushToUI(t)];
    }

    async start() {
        this.current = this.seconds;
        while (this.current > 0) {
            await delay(1000);
            this.current--;
            this.listeners.forEach(fn => fn(this.current!));
        }
        this.current = null;
        this.listeners.forEach(fn => fn());
    }

    addListener(fn: (t?: number)=>void){
        this.listeners.push(fn);
    }

    private pushToDB(t?: number){
        if(t === undefined){
            this.db.set(this.DBPATH, -1);
        } else {
            this.db.set(this.DBPATH, this.current);
        }
    }

    private pushToUI(t?: number){
        console.log("Timer " + t);
    }

}