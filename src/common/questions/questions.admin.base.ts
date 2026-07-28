/**
 * Question module defining the shared model, view, and lifecycle orchestration
 * for a single quiz question.
 *
 * Responsibilities:
 * - `QuestionModel` persists state, submitted answers, and evaluation results.
 * - `QuestionView` renders answers, manual evaluation controls, and progress
 *   feedback into the shared DOM.
 * - `Question` orchestrates the question lifecycle, stop conditions, scoring,
 *   and view updates.
 *
 * Intended usage:
 * 1. Implement a concrete `QuestionModel` subclass with `name` and `displayName`.
 * 2. Implement a concrete `Question` subclass that provides the shared
 *    `QuestionContext` and owns the model instance.
 * 3. Use `ask()` to run the question through ASKING → EVALUATING → SHOWRESULTS → ENDED.
 *
 * Context contracts:
 * - `QuestionContext`: provides `getDatabase()` and `getPeopleList()`.
 * - `QuestionModelContext`: used by models to access the database and notify state updates.
 * - `QuestionViewContext`: used by the view to obtain joined answer/result rows and manual callbacks.
 */
import { IDatabaseAdapter } from "../database/database.types";
import { BaseModel, BaseModelContext } from "../admin.utils";
import { delay, toHtml } from "../general.utils";
import { Person } from "../people/people.model";
import { QuestionAnswers, QuestionAnswersSnapshot, QuestionResult, QuestionResultSnapshot, QuestionState, QuestionStateSnapshot } from "./question.contract";
import { Timer } from "./questions.admin.timer";

interface QuestionModelSnapshot {
    question?: QuestionStateSnapshot;
    answers?: QuestionAnswersSnapshot;
    results?: QuestionResultSnapshot;
}


/**
 * Shared model context required by question models.
 *
 * This interface extends the base model context and is used by all question
 * model instances to access the shared database and notify state changes.
 */
export interface QuestionModelContext extends BaseModelContext { }

/**
 * Base persisted model for a running question.
 *
 * The model owns question lifecycle flags and runtime answer/evaluation maps,
 * and delegates persistence/binding to `BaseModel` using the configured
 * question-related database paths.
 */
export abstract class QuestionModel extends BaseModel<QuestionModelSnapshot> {
    /**
     * Database locations for question lifecycle and results.
     *
     * - `question` stores metadata and state flags.
     * - `answers` stores submitted answers from participants.
     * - `results` stores evaluation results after answer scoring.
     */
    readonly DBPATH = new Map([["question", "/state/question"], ["answers", "/results/answers"], ["results", "/results/evaluation"]]);
    /**
     * Unique runtime question name used to validate persisted state.
     */
    abstract readonly name: string;

    /**
     * Human facing label shown in the question view footer.
     */
    abstract readonly displayName: string;

    /** Current question lifecycle state shared across clients. */
    state: QuestionState;

    /**
     * Answers are the only model property that is expected to synchronize
     * with remote clients during active question answering.
     */
    answers: QuestionAnswers = new Map();
    /** Evaluation outcome keyed by participant id. */
    results: QuestionResult = new Map();
    /** Participant ids that cannot answer the current question. */
    deny: string[] = [];
    /** Enables/disables participant submissions. */
    enableAnswers: boolean = false;
    /** Enables/disables manual evaluation controls in the admin view. */
    enableManualEvaluation: boolean = false;
    /** Enables/disables manual stop control during the ASKING phase. */
    enableManualStopAnswer: boolean = false;
    /** Enables/disables manual stop control during the SHOWRESULTS phase. */
    enableManualStopShowResults: boolean = false;
    private timer: Timer | null = null;

    /** Context providing database access and state update callbacks. */
    context: QuestionModelContext;

    /**
     * @param ctx Model context used for persistence and update notifications.
     * @param deny Initial deny-list for participants who cannot answer.
     */
    constructor(ctx: QuestionModelContext, deny: string[] = []) {
        super();
        this.context = ctx;
        this.state = QuestionState.SETUP;
        this.deny = deny;
    }

    /**
     * Enables or disables participant submissions.
     *
     * When enabled, a realtime binding is created for the answers path.
     * When disabled, the answers listener is removed after a short delay to
     * allow the last submissions to propagate.
     * @param b Whether new answers are accepted.
     */
    allowNewAnswers(b: boolean) {
        this.enableAnswers = b;
        this.saveToDatabase();
        if (b) {
            this.setupTwoWayBinding(["answers"]);
        } else {
            setTimeout(() => {
                this.removeBinding(["answers"]);
            }, 1000);
        }
    }

    /**
     * Starts an internal countdown timer and persists its shared state.
     * @param seconds Duration in seconds.
     */
    async startTimer(seconds: number) {
        this.timer = new Timer(seconds, this.context.getDatabase());
        await this.timer.start();
        this.timer = null;
    }

    /**
     * Returns whether a question timer is currently active.
     */
    isTimerActive() {
        return !!this.timer;
    }
    /**
     * Registers a listener to receive clock ticks from the active timer.
     * @param listener Function invoked with remaining seconds or undefined when expired.
     */
    setTimerClockListener(listener: (t?: number) => void) {
        this.timer?.addListener(listener);
    }

    /**
     * Current remaining timer seconds while the timer is active.
     */
    get timerTime() {
        return this.timer?.currentTime;
    }

    /**
     * Parses persisted question data back into model state.
     *
     * This method is expected to handle partial payloads from the model's
     * `DBPATH` map and restore answers, results, and question metadata.
     * @param data Raw JSON object loaded from the database.
     * @returns True when at least one known property was parsed.
     */
    parseFromJSON(data: Partial<QuestionModelSnapshot>): boolean {
        try {
            var some = false;
            if (data.question) {
                some = true;
                if (data.question.name != this.name) throw new Error("Question name conflict")
                this.state = data.question.state;
                this.deny = data.question.deny;
                this.enableAnswers = data.question.enableAnswers;
                this.enableManualEvaluation = data.question.enableManualEvaluation;
            }
            if (data.answers) {
                some = true;
                const a: QuestionAnswers = new Map()
                for (const [id, answer] of Object.entries(data.answers)) {
                    a.set(id, { time: new Date(answer.time), answer: answer.answer });
                }
                this.answers = a;
            }
            if (data.results) {
                some = true;
                this.results = new Map(Object.entries(data.results));
            }
            return some;
        } catch {
            return false;
        }

    }

    /**
     * Serializes the question metadata and evaluation results for persistence.
     *
     * The answers collection is intentionally excluded because participant
     * answer submission is handled by the users themselves.
     */
    toJSON(): QuestionModelSnapshot {
        return {
            question: {
                name: this.name,
                displayName: this.displayName,
                state: this.state,
                deny: this.deny,
                enableAnswers: this.enableAnswers,
                enableManualEvaluation: this.enableManualEvaluation,
            },
            results: Object.fromEntries(this.results),
        }
    }

}

/**
 * Context contract required by the question view renderer.
 *
 * The view depends on a model instance, a joined answer/result list, and
 * callbacks for manual user interactions.
 */
export interface JoinedQuestionRow {
    id: string;
    name?: string;
    answer?: string;
    result?: boolean;
}

export interface QuestionViewContext {
    /** Active question model used to drive rendering. */
    model: QuestionModel;
    /**
     * Returns answer/evaluation rows joined with participant metadata.
     * @param fillEmptyResults When true, missing results are initialized.
     */
    getJoinedList(fillEmptyResults: boolean): JoinedQuestionRow[];
    /** Updates one participant evaluation result. */
    setResultOf(id: string, result: boolean): void;
    /** Manual callback to stop the ASKING phase. */
    manualStop: (() => void) | null;
    /** Manual callback to complete the EVALUATING phase. */
    manualEvaluationEnded: (() => void) | null;
    /** Manual callback to complete the SHOWRESULTS phase. */
    manualStopShowResults: (() => void) | null;
}
/**
 * Renders current question answers and controls into the shared DOM.
 *
 * The view assumes the following container IDs exist:
 * - `question-container`
 * - `question-answers`
 * - `question-actions`
 */
export class QuestionView {
    /** DOM id of the question wrapper container. */
    readonly questionContainer = "question-container";
    /** DOM id of the answers table body container. */
    readonly questionAnswersContainer = "question-answers";
    /** DOM id of the question footer/action container. */
    readonly questionFooter = "question-actions";
    /** Source of model data and action callbacks used by render/listeners. */
    context: QuestionViewContext;

    /**
     * @param context Runtime context used to render rows and invoke actions.
     */
    constructor(context: QuestionViewContext) {
        this.context = context;
        this.attachListeners();
    }

    /**
     * Rebuilds the answer list and footer controls based on the current model.
     *
     * This method is the primary render entry point for the question view.
     * It:
     * - toggles the active question container based on ASKING/EVALUATING state
     * - re-renders each participant row with answer text and optional manual checkboxes
     * - renders the timer value during ASKING state
     * - renders the appropriate footer button for manual control flows
     */
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
            button = `<button class="active">Mostra risultati</button>`
        } else if (this.context.model.enableManualStopShowResults && state == QuestionState.SHOWRESULTS) {
            button = `<button class="active">FINE</button>`
        }
        footer.innerHTML = `<span>${this.context.model.displayName} - ${QuestionState[state]}</span><span>${hast ? `<span id='question-timer'>${this.context.model.timerTime ?? "&infin;"}</span>` : ""}${button}`;
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
                if (this.context.model.enableManualStopShowResults && this.context.model.state == QuestionState.SHOWRESULTS) this.context.manualStopShowResults?.();
            });
        }
    }

    private listenerController = new AbortController();
    /**
     * Listens for manual evaluation checkbox changes and updates the model.
     */
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

    /**
     * Clears listeners and removes rendered answer/footer content.
     */
    clear() {
        this.listenerController.abort();
        const container = document.getElementById(this.questionAnswersContainer) as HTMLElement;
        container.innerHTML = "";
        const footer = document.getElementById(this.questionFooter) as HTMLElement;
        footer.innerHTML = "";
    }
}

/**
 * Shared application context used by concrete question implementations.
 *
 * Implementations must provide access to the shared database and to current
 * participant metadata used to join answers with names.
 */
export interface QuestionContext {
    /** Returns the shared realtime database adapter. */
    getDatabase(): IDatabaseAdapter;
    /** Returns the current participant list keyed by participant id. */
    getPeopleList(): Map<string, Person>;
}

/**
 * Auto/manual evaluation configuration for a question.
 *
 * - `auto` can be a string comparator or an answer predicate.
 * - `manual` enables a manual review step.
 */
export interface Evaluator {
    auto?: string | ((answer: string) => boolean);
    manual?: boolean;
}

/**
 * Question completion criteria.
 *
 * - `timer` sets an automatic timeout.
 * - `manual` allows manual stop controls.
 * - `stopWhen` evaluates submitted answers and triggers auto-stop.
 */
export interface Ender {
    timer?: number;
    manual?: boolean;
    stopWhen?: (a: QuestionAnswers) => boolean;
}

/**
 * Optional lifecycle hooks used by `Question.ask()`.
 *
 * Use `beforeShowResults` to control whether and how long the SHOWRESULTS phase
 * is displayed. Use `beforeEnd` for any cleanup or deferred finalization before
 * the question transitions to ENDED.
 */
export interface QuestionAskCallbacks {
    /**
     * Called after evaluation completes and before the SHOWRESULTS phase.
     *
     * Return values:
     * - `number` → show results for that many milliseconds.
     * - `true` → show results until the user presses the manual finish button.
     * - `false`, `0`, or any falsy value → skip the SHOWRESULTS phase entirely.
     */
    beforeShowResults?: (res: QuestionResult) => Promise<boolean | number>;

    /**
     * Called after the SHOWRESULTS phase completes or is skipped, before the
     * question is marked ENDED.
     */
    beforeEnd?: (res: QuestionResult) => Promise<void>;
}

/**
 * Base class that coordinates question lifecycle, evaluation, persistence,
 * and view rendering.
 *
 * Concrete question implementations must provide a `model` instance and
 * define the question-specific metadata exposed through `name` and `displayName`.
 */
export abstract class Question implements QuestionModelContext, QuestionViewContext {
    /**
     * Auto-evaluation predicate derived from the `Evaluator.auto` config.
     *
     * When non-null, each submitted answer is scored automatically during
     * evaluation.
     */
    autoevaluate: null | ((answer: string) => boolean);

    /**
     * Whether manual review of answers is required after auto-evaluation.
     */
    manualevaluate: boolean;

    /**
     * Criteria used to decide when the ASKING phase ends.
     */
    ender: Ender;

    /** Concrete question model owned by this lifecycle orchestrator. */
    abstract model: QuestionModel;
    /** Parent runtime context shared by game/quiz orchestration. */
    context: QuestionContext;
    /** Admin-side question view renderer bound to this instance. */
    view: QuestionView;

    /**
     * Creates a question controller instance.
     *
     * Concrete subclasses must initialize `model` and can rely on the base class
     * to coordinate lifecycle, evaluation, persistence, and view updates.
     * @param ctx Shared application context used by the question.
     * @param evaluate Auto/manual evaluation configuration.
     * @param stopAnswersCriteria Criteria for ending the answer collection phase.
     */
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

    /**
     * Callback used while the SHOWRESULTS phase is waiting for manual completion.
     *
     * When `beforeShowResults()` returns a non-number truthy value, this callback
     * is assigned and the view renders a manual end button.
     */
    manualStopShowResults: (() => void) | null = null;

    /**
     * Runs the full question lifecycle.
     *
     * The base workflow is:
     * 1. Set state to ASKING and allow new answers.
     * 2. Wait for a stop condition from timer, stopWhen predicate, or manual STOP.
     * 3. Disable answers and transition to EVALUATING.
     * 4. Apply auto-evaluation and/or wait for manual evaluation.
     * 5. Optionally enter SHOWRESULTS and either wait a fixed delay or manual finish.
     * 6. Call `beforeEnd`, mark the question ENDED, and return the final results.
     *
     * Callback details:
     * - `beforeShowResults(res)`:
     *   - return a number to display results for that many milliseconds
     *   - return `true` to show results until the user presses the manual end button
     *   - return `false`, `0`, or a falsy value to skip the SHOWRESULTS phase entirely
     * - `beforeEnd(res)`:
     *   - invoked after the SHOWRESULTS phase completes or after it is skipped
     *   - useful for cleanup, delayed side effects, or result finalization
     *
     * @param callbacks Optional hooks to customize result display and finalization.
     * @returns The final evaluation result map.
     */
    async ask(callbacks?: QuestionAskCallbacks): Promise<QuestionResult> {
        const beforeShowResults = callbacks?.beforeShowResults ?? ((res) => Promise.resolve(5000));
        const beforeEnd = callbacks?.beforeEnd ?? (async (res) => await delay(50));

        this.model.state = QuestionState.ASKING;
        this.model.allowNewAnswers(true);
        const stop = this.stopConditions();
        this.stateUpdated();
        await stop;

        this.model.allowNewAnswers(false);
        this.model.state = QuestionState.EVALUATING;
        this.stateUpdated();
        this.model.results = await this.evaluate();

        this.model.state = QuestionState.IDLE;
        this.stateUpdated();
        const showResults = await beforeShowResults(this.model.results);

        if(!!showResults){
            this.model.state = QuestionState.SHOWRESULTS;
            this.stateUpdated();
            if(typeof showResults == "number") {
                await delay(showResults);
            } else {
                this.model.enableManualStopShowResults = true;
                await new Promise<void>((resolve, reject) => {
                    this.manualStopShowResults = () => {
                        this.model.enableManualStopShowResults = false;
                        this.manualStopShowResults = null;
                        this.view.render();
                        resolve();
                    }
                    this.view.render();
                });
            }
        }

        await beforeEnd(this.model.results);

        this.model.state = QuestionState.ENDED;
        this.stateUpdated();
        await delay(50);
        return this.model.results;
    }

    /**
     * Clears the view and removes all persisted question state.
     *
     * This is typically called after question completion or when the current
     * question needs to be reset entirely. It removes any rendered UI and
     * deletes the shared question state from the database.
     */
    clear() {
        this.view.clear();
        this.model.clearDatabase();
    }

    /**
     * Callback used to end the ASKING phase from an automatic stop condition.
     *
     * Assigned when `ender.stopWhen` is configured and invoked on remote answer
     * updates inside `stateUpdated(true)`.
     */
    autoStop: ((a: QuestionAnswers) => void) | null = null;

    /**
     * Callback used to end the ASKING phase from the manual STOP button.
     *
     * When set, the rendered STOP button triggers this callback to resolve the
     * active stop condition promise.
     */
    manualStop: (() => void) | null = null
    /**
     * Builds and waits for the first stop condition to complete.
     *
     * The returned promise resolves when one of the configured stop triggers fires:
     * - a countdown timer expires
     * - the `stopWhen` predicate returns true for the collected answers
     * - the manual STOP button is pressed
     *
     * If no stop criteria are provided, manual stop is enabled by default to
     * avoid stalling the question flow.
     */
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

    /**
     * Callback used to conclude manual evaluation mode when the reviewer is done.
     *
     * This is set when manual evaluation is enabled, and the view renders the
     * `Mostra risultati` button to allow review completion.
     */
    manualEvaluationEnded: (() => void) | null = null
    /**
     * Performs answer evaluation and optionally waits for manual review.
     *
     * Auto-evaluation is applied immediately when configured. Manual evaluation
     * switches the UI into review mode and pauses until `manualEvaluationEnded`
     * is triggered by the view's finish button.
     * @returns The results map after scoring or manual review.
     */
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

    /**
     * Saves the current model state and refreshes the view.
     *
     * On local state changes, the model is persisted before rendering. When
     * called for remote updates (`remote = true`), it avoids writing back to
     * the database and may invoke the automatic stop callback if a remote answer
     * update satisfies the configured stop condition.
     */
    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        this.view.render();
        if (remote && !!this.autoStop) this.autoStop(this.model.answers);
    }

    /**
     * Returns the shared database adapter from the parent context.
     */
    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    /**
     * Updates a single participant's evaluation result.
     *
     * This method is invoked by the view during manual review when a checkbox changes.
     * It persists the updated result immediately.
     */
    setResultOf(id: string, result: boolean): void {
        this.model.results.set(id, result);
        this.model.saveToDatabase();
    }

    /**
     * Returns the participant rows joined with answer text and evaluation results.
     *
     * If `fillEmptyResults` is true, missing result values are initialized to false
     * so the UI can display a complete manual evaluation table.
     * The returned rows are sorted by result (correct first) and by submission time.
     */
    getJoinedList(fillEmptyResults: boolean = false) {
        const people = this.context.getPeopleList();
        const answers = this.model.answers;
        const results = this.model.results;

        if (fillEmptyResults) {
            for (const id of answers.keys()) {
                if (!results.has(id)) {
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
            }
        }).sort((a, b) =>
            a.result != b.result
                ?
                +(b.result ?? 0) - +(a.result ?? 0)
                :
                ((a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0))
        );
    }
}