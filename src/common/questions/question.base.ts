import { BaseModel, BaseModelContext } from "../general.interfaces";
import { Timer } from "./timer";


export interface QuestionModelContext extends BaseModelContext { }

type QuestionResult = { id: string, correct: boolean }[];
type QuestionAnswers = Map<string, { time: Date, answer: string }>;

export abstract class QuestionModel extends BaseModel {
    readonly DBPATH = new Map([["question", "/question"], ["answers", "/answers"], ["results", "/results"]]);

    abstract readonly name: string;
    answers: QuestionAnswers = new Map(); // ONLY PROPERTY TO LISTEN FOR REMOTE CHANGES
    results: QuestionResult = [];
    deny: string[] = [];
    enableAnswers: boolean = false;
    enableManualEvaluation: boolean = false;
    private timer: Timer|null = null;

    context: QuestionModelContext;

    constructor(ctx: QuestionModelContext) {
        super();
        this.context = ctx;
    }

    async startTimer(seconds : number){
        this.timer = new Timer(seconds, this.context.getDatabase());
        await this.timer.start();
        this.timer = null;
    }

    /* parseFromJSON(data: any): boolean {
        
    }

    toJSON() {
        
    } */

}

export abstract class Question {
    autoevaluate: null | ((answer: string) => boolean);
    manualevaluate: boolean;
    abstract model: QuestionModel;

    constructor(evaluate: { auto?: "string"|((answer: string) => boolean), manual?: boolean }) {
        if (!evaluate.auto && evaluate.manual === false) throw new Error("How can I evaluate the answers?");
        if(typeof evaluate.auto === "string"){
            const c = evaluate.auto;
            this.autoevaluate = (answer) => answer.trim().toLowerCase() == c.trim().toLowerCase();
        } else {
            this.autoevaluate = evaluate.auto ?? null;
        }
        this.manualevaluate = evaluate.manual ?? false;
    }

    abstract ask(): Promise<QuestionResult>

    manualEvaluationEnded: ((value: any) => void) | null = null
    async evaluate(): Promise<QuestionResult> {
        const ans = this.model.answers;
        if (!!this.autoevaluate) {
            const fn = this.autoevaluate
            const unordered = ans.entries().map(([i, x]) => {
                return { id: i, correct: fn(x.answer) }
            }).toArray()
        }
        if (this.manualevaluate) {
            this.model.enableManualEvaluation = true;
            this.stateUpdated();
            await new Promise((resolve, reject) => {
                this.manualEvaluationEnded = resolve;
            });
            this.model.enableManualEvaluation = false;
        }
        this.model.results = Question.sortResults(this.model.results, ans);
        this.stateUpdated();
        return this.model.results;
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
    }
}