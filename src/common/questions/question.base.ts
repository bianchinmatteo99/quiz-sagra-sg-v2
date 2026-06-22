import { IDatabaseAdapter } from "../database/database.types.old";
import { BaseModel, BaseModelContext } from "../general.utils";
import { Timer } from "./timer";


export interface QuestionModelContext extends BaseModelContext { }

export type QuestionResult = { id: string, correct: boolean }[];
export type QuestionAnswers = Map<string, { time: Date, answer: string }>;
export enum QuestionState {
    SETUP,
    ASKING,
    EVALUATING,
    ENDED
}

export abstract class QuestionModel extends BaseModel {
    readonly DBPATH = new Map([["question", "/question"], ["answers", "/answers"], ["results", "/results"]]);
    abstract readonly name: string;

    state: QuestionState;
    answers: QuestionAnswers = new Map(); // ONLY PROPERTY TO LISTEN FOR REMOTE CHANGES
    results: QuestionResult = [];
    deny: string[] = [];
    enableAnswers: boolean = false;
    enableManualEvaluation: boolean = false;
    enableManualStopAnswer: boolean = false;
    private timer: Timer|null = null;

    context: QuestionModelContext;

    constructor(ctx: QuestionModelContext, deny:string[] = []) {
        super();
        this.context = ctx;
        this.state = QuestionState.SETUP;
        this.deny = deny;
    }

    async startTimer(seconds : number){
        this.timer = new Timer(seconds, this.context.getDatabase());
        await this.timer.start();
        this.timer = null;
    }

    parseFromJSON(data: any): boolean {
        try{
            var some = false;
            if("question" in data){
                some = true;
                if(data.name != this.name) throw new Error("Question name conflict")
                this.state = data.state;
                this.deny = data.deny;
                this.enableAnswers = Boolean(data.enableAnswers);
                this.enableManualEvaluation = Boolean(data.enableManualEvaluation);
            }
            if("answers" in data){
                some = true;
                const a: QuestionAnswers = new Map()
                for (const id in data.answers){
                    a.set(id, {time: new Date(data.time), answer: data.answer});
                }
            }
            if("results" in data){
                some = true;
                this.results = data.results;
            }
            return some;
        } catch {
            return false;
        }
        
    }

    toJSON() {
        return { // answers is only updated by users
            question: {
                name: this.name,
                state: this.state,
                deny: this.deny,
                enableAnswers: this.enableAnswers,
                enableManualEvaluation: this.enableManualEvaluation,
            },
            results: this.results,
        }
    }

}

export interface QuestionContext {
    getDatabase(): IDatabaseAdapter;
}
export type Evaluator = { auto?: string|((answer: string) => boolean), manual?: boolean };
export type Ender = { timer?: number, manual?: boolean, stopWhen?: (a:QuestionAnswers)=>boolean} // manual default is true to avoid runtime stall
export abstract class Question implements QuestionModelContext {
    autoevaluate: null | ((answer: string) => boolean);
    manualevaluate: boolean;
    ender: Ender;
    abstract model: QuestionModel;
    context: QuestionContext;

    constructor(ctx: QuestionContext, evaluate: Evaluator, stopAnswersCriteria: Ender) {
        this.context = ctx;

        if (!evaluate.auto && evaluate.manual === false) throw new Error("How can I evaluate the answers?");
        if(typeof evaluate.auto === "string"){
            const c = evaluate.auto;
            this.autoevaluate = (answer) => answer.trim().toLowerCase() == c.trim().toLowerCase();
        } else {
            this.autoevaluate = evaluate.auto ?? null;
        }
        this.manualevaluate = evaluate.manual ?? false;

        this.ender = stopAnswersCriteria;
    }

    async ask(): Promise<QuestionResult>{
        this.model.state = QuestionState.ASKING;
        this.model.enableAnswers = true;
        const stop = this.stopConditions();
        this.stateUpdated();
        await stop;
        this.model.state = QuestionState.EVALUATING;
        this.model.enableAnswers = false;
        this.stateUpdated();
        this.model.results = await this.evaluate();
        this.model.state = QuestionState.ENDED;
        this.stateUpdated();
        this.model.clearDatabase();
        // detatch view?
        return this.model.results;
    }

    autoStop: ((a:QuestionAnswers)=>void) | null = null;
    manualStop: (() => void) | null = null
    async stopConditions(): Promise<void> {
        const conditions: Promise<void>[] = [];
        if (!!this.ender.timer){
            conditions.push(this.model.startTimer(this.ender.timer));
        }
        if (!!this.ender.stopWhen){
            const shouldStop = this.ender.stopWhen;
            conditions.push(new Promise((resolve, reject) => {
                this.autoStop = (a:QuestionAnswers) => {
                    if (shouldStop(a)) {
                        this.autoStop = null;
                        resolve();
                    }
                };
            }));
        }
        if (this.ender.manual!=false || conditions.length < 1){
            this.model.enableManualStopAnswer = true;
            conditions.push(new Promise((resolve, reject) => {
                this.manualStop = () => {
                    this.model.enableManualStopAnswer = false;
                    this.manualStop = null;
                    resolve();
                };
            }));
        }
        return Promise.race(conditions);
    }

    manualEvaluationEnded: (() => void) | null = null
    async evaluate(): Promise<QuestionResult> {
        const ans = this.model.answers;
        if (!!this.autoevaluate) {
            const fn = this.autoevaluate
            this.model.results = ans.entries().map(([i, x]) => {
                return { id: i, correct: fn(x.answer) }
            }).toArray()
        }
        if (this.manualevaluate) {
            this.model.enableManualEvaluation = true;
            this.stateUpdated();
            await new Promise<void>((resolve, reject) => {
                this.manualEvaluationEnded = () => {
                    this.model.enableManualEvaluation = false;
                    this.manualEvaluationEnded = null;
                    resolve();
                }
            });
        }
        return Question.sortResults(this.model.results, ans);
    }

    static sortResultsByTime(ev: QuestionResult, ans: QuestionAnswers): QuestionResult {
        return ev.sort((a, b) => ((ans.get(a.id)?.time.getTime() ?? 0) - (ans.get(b.id)?.time.getTime() ?? 0)));
    }
    static sortResults(ev: QuestionResult, ans: QuestionAnswers): QuestionResult {
        return ev.sort((a, b) => a.correct==b.correct ? +b.correct-+a.correct :((ans.get(a.id)?.time.getTime() ?? 0) - (ans.get(b.id)?.time.getTime() ?? 0)));
    }

    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        // this.view.render();
        if(remote && !!this.autoStop) this.autoStop(this.model.answers);
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }
}