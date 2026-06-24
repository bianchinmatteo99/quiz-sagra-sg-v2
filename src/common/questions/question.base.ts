import { IDatabaseAdapter } from "../database/database.types.old";
import { BaseModel, BaseModelContext, toHtml } from "../general.utils";
import { Person } from "../people/people.model";
import { Timer } from "./timer";


export interface QuestionModelContext extends BaseModelContext { }

export type QuestionResult = Map<string, boolean>;// { id: string, correct: boolean }[];
export type QuestionAnswers = Map<string, { time: Date, answer: string }>;
export enum QuestionState {
    SETUP,
    ASKING,
    EVALUATING,
    ENDED
}

export abstract class QuestionModel extends BaseModel {
    readonly DBPATH = new Map([["question", "/state/question"], ["answers", "/results/answers"], ["results", "/results/evaluation"]]);
    abstract readonly name: string;
    abstract readonly displayName: string;

    state: QuestionState;
    answers: QuestionAnswers = new Map([["test", { time: new Date(Date.now()), answer: "catena" }]]); // ONLY PROPERTY TO LISTEN FOR REMOTE CHANGES // TODO: Remove test answer
    results: QuestionResult = new Map();
    deny: string[] = [];
    enableAnswers: boolean = false;
    enableManualEvaluation: boolean = false;
    enableManualStopAnswer: boolean = false;
    private timer: Timer | null = null;

    context: QuestionModelContext;

    constructor(ctx: QuestionModelContext, deny: string[] = []) {
        super();
        this.context = ctx;
        this.state = QuestionState.SETUP;
        this.deny = deny;
    }

    allowNewAnswers(b: boolean) {
        this.enableAnswers = b;
        this.saveToDatabase();
        if (b) {
            this.setupTwoWayBinding(["answers"]);
        } else {
            this.removeBinding(["answers"]);
        }
    }

    async startTimer(seconds: number) {
        this.timer = new Timer(seconds, this.context.getDatabase());
        await this.timer.start();
        this.timer = null;
    }
    isTimerActive() {
        return !!this.timer;
    }
    setTimerClockListener(listener: (t?: number) => void) {
        this.timer?.addListener(listener);
    }

    parseFromJSON(data: any): boolean {
        try {
            var some = false;
            if ("question" in data) {
                some = true;
                if (data.name != this.name) throw new Error("Question name conflict")
                this.state = data.state;
                this.deny = data.deny;
                this.enableAnswers = Boolean(data.enableAnswers);
                this.enableManualEvaluation = Boolean(data.enableManualEvaluation);
            }
            if ("answers" in data) {
                some = true;
                const a: QuestionAnswers = new Map()
                for (const id in data.answers) {
                    a.set(id, { time: new Date(data.time), answer: data.answer });
                }
            }
            if ("results" in data) {
                some = true;
                this.results = new Map(Object.entries(data.results));
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
            results: Object.fromEntries(this.results),
        }
    }

}

export interface QuestionViewContext {
    model: QuestionModel;
    getJoinedList(illEmptyResults: boolean): { id: string, name?: string, answer?: string, result?: boolean }[];
    setResultOf(id: string, result: boolean): void;
    manualStop: (() => void) | null;
    manualEvaluationEnded: (() => void) | null;
}
export class QuestionView {
    readonly questionContainer = "question-container";
    readonly questionAnswersContainer = "question-answers";
    readonly questionFooter = "question-actions";
    context: QuestionViewContext;
    constructor(context: QuestionViewContext) {
        this.context = context;
        this.attachListeners();
    }

    render() {
        const state = this.context.model.state;
        document.getElementById(this.questionContainer)?.classList.toggle("active", [QuestionState.ASKING, QuestionState.EVALUATING].includes(state));

        const container = document.getElementById(this.questionAnswersContainer) as HTMLElement;
        container.innerHTML = "";

        const ev = this.context.model.enableManualEvaluation;
        const info = this.context.getJoinedList(ev);

        for (const o of info) {
            const check = ev ? `<input type='checkbox' ${o.result ? "checked" : ""} aria-invalid="${!o.result}">` : ""
            const row = toHtml(`
                        <tr data-id="${o.id}">
                            <th scope="row">${o.name ?? "Errore nome sconosciuto"}</th>
                            <td>${o.answer ?? ""}</td>
                            <td>${check}</td>
                        </tr>
                    `);
            container.appendChild(row);
        }

        const footer = document.getElementById(this.questionFooter) as HTMLElement;
        const hast = state == QuestionState.ASKING && this.context.model.isTimerActive();
        let button = "";
        if (this.context.model.enableManualStopAnswer && state == QuestionState.ASKING) {
            button = `<button>STOP</button>`
        } else if (this.context.model.enableManualEvaluation && state == QuestionState.EVALUATING) {
            button = `<button class="active">CONCLUDI</button>`
        }
        footer.innerHTML = `<span>${this.context.model.displayName} - ${QuestionState[state]}</span><span>${hast ? "<span id='question-timer'>&infin;</span>" : ""}${button}`;
        if (hast) {
            const timerContainer = footer.querySelector("#question-timer")!
            this.context.model.setTimerClockListener((t) => {
                if (state == QuestionState.ASKING) timerContainer.textContent = String(t ?? 0);
            });
        }
        if (button != "") {
            footer.querySelector("button")!.addEventListener("click", (e) => {
                if (this.context.model.enableManualStopAnswer && this.context.model.state == QuestionState.ASKING) this.context.manualStop?.();
                if (this.context.model.enableManualEvaluation && this.context.model.state == QuestionState.EVALUATING) this.context.manualEvaluationEnded?.();
            });
        }
    }

    private listenerController = new AbortController();
    attachListeners() {
        const container = document.getElementById(this.questionAnswersContainer) as HTMLElement;
        container.addEventListener("change", (e) => {
            const input = e.target as HTMLInputElement;

            if (input?.type !== "checkbox") return;

            const tr = input.closest("tr");
            const id = tr?.getAttribute("data-id");
            if (!id) return;

            const value = input.checked;
            input.setAttribute("aria-invalid", String(!value));
            if (this.context.model.enableManualEvaluation) {
                this.context.setResultOf(id, value);
            }
        }, { signal: this.listenerController.signal });
    }

    clear() {
        this.listenerController.abort();
        const container = document.getElementById(this.questionAnswersContainer) as HTMLElement;
        container.innerHTML = "";
        const footer = document.getElementById(this.questionFooter) as HTMLElement;
        footer.innerHTML = "";
    }
}

export interface QuestionContext {
    getDatabase(): IDatabaseAdapter;
    getPeopleList(): Map<string, Person>;
}
export type Evaluator = { auto?: string | ((answer: string) => boolean), manual?: boolean };
export type Ender = { timer?: number, manual?: boolean, stopWhen?: (a: QuestionAnswers) => boolean } // manual default is true to avoid runtime stall
export abstract class Question implements QuestionModelContext, QuestionViewContext {
    autoevaluate: null | ((answer: string) => boolean);
    manualevaluate: boolean;
    ender: Ender;
    abstract model: QuestionModel;
    context: QuestionContext;
    view: QuestionView;

    constructor(ctx: QuestionContext, evaluate: Evaluator, stopAnswersCriteria: Ender) {
        this.context = ctx;

        if (!evaluate.auto && evaluate.manual === false) throw new Error("How can I evaluate the answers?");
        if (typeof evaluate.auto === "string") {
            const c = evaluate.auto;
            this.autoevaluate = (answer) => answer.trim().toLowerCase() == c.trim().toLowerCase();
        } else {
            this.autoevaluate = evaluate.auto ?? null;
        }
        this.manualevaluate = evaluate.manual ?? false;

        this.ender = stopAnswersCriteria;
        this.view = new QuestionView(this);
    }

    async ask(): Promise<QuestionResult> {
        this.model.state = QuestionState.ASKING;
        this.model.allowNewAnswers(true);
        const stop = this.stopConditions();
        this.stateUpdated();
        await stop;
        this.model.allowNewAnswers(false);
        this.model.state = QuestionState.EVALUATING;
        this.stateUpdated();
        this.model.results = await this.evaluate();
        this.model.state = QuestionState.ENDED;
        this.stateUpdated();
        return this.model.results;
    }

    clear() {
        this.view.clear();
        this.model.clearDatabase();
    }

    autoStop: ((a: QuestionAnswers) => void) | null = null;
    manualStop: (() => void) | null = null
    async stopConditions(): Promise<void> {
        const conditions: Promise<void>[] = [];
        if (!!this.ender.timer) {
            conditions.push(this.model.startTimer(this.ender.timer));
        }
        if (!!this.ender.stopWhen) {
            const shouldStop = this.ender.stopWhen;
            conditions.push(new Promise((resolve, reject) => {
                this.autoStop = (a: QuestionAnswers) => {
                    if (shouldStop(a)) {
                        this.autoStop = null;
                        resolve();
                    }
                };
            }));
        }
        if (this.ender.manual != false || conditions.length < 1) {
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
            this.model.results = new Map();
            for (const [id, x] of ans.entries()) {
                this.model.results.set(id, fn(x.answer))
            }
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
        return this.model.results;
    }

    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        this.view.render();
        if (remote && !!this.autoStop) this.autoStop(this.model.answers);
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    setResultOf(id: string, result: boolean): void {
        this.model.results.set(id, result);
        this.model.saveToDatabase();
    }

    getJoinedList(fillEmptyResults: boolean = false) {
        const people = this.context.getPeopleList();
        const answers = this.model.answers;
        const results = this.model.results;

        if (fillEmptyResults) {
            for (const id of answers.keys()) {
                if (!(id in results)) {
                    results.set(id, false);
                }
            }
            this.model.saveToDatabase();
        }

        return answers.keys().toArray().map(id => {
            return {
                id: id,
                name: people.get(id)?.name,
                time: answers.get(id)?.time,
                answer: answers.get(id)?.answer,
                result: results.get(id) 
            }}).sort((a, b) => 
                a.result != b.result 
                  ? 
                    +(b.result ?? 0) - +(a.result ?? 0) 
                  : 
                    ((a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0))
            );
    }
}