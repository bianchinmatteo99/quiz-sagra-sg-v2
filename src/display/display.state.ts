import { IDatabaseAdapter } from "../common/database/database.types"
import { CancelHandle } from "../common/general.utils"
import { QuestionState } from "../common/questions/question.base"
import { QuizStatus } from "../common/quiz/quiz.model"

/**
 * Snapshot of the quiz application state exposed to the display layer.
 */
type AppState = {
    quiz: { status: QuizStatus },
    game?: { name: string },
    question?: {
        name: string,
        state: QuestionState,
        enableAnswers: boolean,
        deny?: string[],
    }
}

/**
 * Optional information about the currently tracked person or team.
 */
type PersonState = null | {
    name: string,
    rank?: {
        lastpos: number,
        lastupdate: number,
        points: number,
        position: number,
    }
}

/**
 * The state shape consumed by the display flow, including app state, person state and current decision path.
 */
export type DisplayState = { app: AppState, person: PersonState, questionresult: boolean|null, currentDecisionLeaf: string }

/**
 * Tracks display-facing state from the database and notifies observers when it changes.
 */
export class DisplayStateHandler {
    static readonly APPSTATEPATH = "/state"
    static readonly PERSONPATH = "/people/list"
    static readonly RESULTSPATH = "/results/evaluation"
    static readonly ANSWERSPATH = "/results/answers"
    private db: IDatabaseAdapter;
    private state?: DisplayState;

    /**
     * Returns the latest snapshot of the display state.
     */
    get read(){
        return this.state;
    }
    private _bindingCancel: CancelHandle[] = [];

    /**
     * Creates a new state handler bound to a database adapter.
     *
     * @param db The database adapter used to listen for state updates.
     */
    constructor(db: IDatabaseAdapter) {
        this.db = db;
    }

    private pending = false;
    private observers : Set<(state : DisplayState)=>void> = new Set();

    /**
     * Registers a callback that is invoked whenever the display state changes.
     *
     * @param o The observer callback.
     * @returns A cancel handle that removes the observer.
     */
    addObserver(o:(state : DisplayState)=>void): CancelHandle{
        this.observers.add(o);
        if(!!this.state) o(this.state);
        return ()=>this.observers.delete(o);
    }

    /**
     * Schedules a state update notification for the next microtask if one is not already pending.
     */
    scheduleUpdate() {
        this.requiresSetup();
        if (this.pending) return;

        this.pending = true;

        queueMicrotask(() => {
            this.pending = false;
            this.observers.forEach(f=>f(this.state!));
        });
    }

    /**
     * Initializes the handler, creates the initial state snapshot and binds to the app state stream.
     */
    async setup() {
        if (!!this.state) throw new Error("Setup already run!");
        this.state = { app: { quiz: { status: QuizStatus.Booting } }, person: null, questionresult: null, currentDecisionLeaf: "" };
        this._bindingCancel.push(this.db.onValue<AppState>(DisplayStateHandler.APPSTATEPATH, (data) => {
            if (data !== null && data !== undefined) {
                this.state!.app = data;
                this.scheduleUpdate();
            }
        }));
        // TODO: OTHER BINDINGS?
    }

    /**
     * Records the current decision path so the UI can trace which page was selected.
     *
     * @param path The parent decision path.
     * @param pagename The current page name.
     */
    setCurrentPath(path:string, pagename:string){
        this.state!.currentDecisionLeaf = path+">"+pagename;
        console.log(this.state!.currentDecisionLeaf);
    }

    /**
     * Ensures the handler has been initialized before it is used.
     */
    requiresSetup() {
        if (!this.state) throw new Error("Did you run setup?");
    }
}