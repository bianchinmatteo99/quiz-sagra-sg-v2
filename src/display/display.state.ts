import { IDatabaseAdapter } from "../common/database/database.types"
import { CancelHandle } from "../common/general.utils"
import { QuestionState } from "../common/questions/question.base"
import { QuizStatus } from "../common/quiz/quiz.model"

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

type PersonState = null | {
    name: string,
    rank?: {
        lastpos: number,
        lastupdate: number,
        points: number,
        position: number,
    }
}

export type DisplayState = { app: AppState, person: PersonState, questionresult: boolean|null, currentDecisionLeaf: string }

export class DisplayStateHandler {
    static readonly APPSTATEPATH = "/state"
    static readonly PERSONPATH = "/people/list"
    static readonly RESULTSPATH = "/results/evaluation"
    static readonly ANSWERSPATH = "/results/answers"
    private db: IDatabaseAdapter;
    private state?: DisplayState;
    get read(){
        return this.state;
    }
    private _bindingCancel: CancelHandle[] = [];

    constructor(db: IDatabaseAdapter) {
        this.db = db;
    }

    private pending = false;
    private observers : Set<(state : DisplayState)=>void> = new Set();

    addObserver(o:(state : DisplayState)=>void): CancelHandle{
        this.observers.add(o);
        if(!!this.state) o(this.state);
        return ()=>this.observers.delete(o);
    }

    scheduleUpdate() {
        this.requiresSetup();
        if (this.pending) return;

        this.pending = true;

        queueMicrotask(() => {
            this.pending = false;
            this.observers.forEach(f=>f(this.state!));
        });
    }

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
    
    setCurrentPath(path:string, pagename:string){
        this.state!.currentDecisionLeaf = path+">"+pagename;
        console.log(this.state!.currentDecisionLeaf);
    }
    requiresSetup() {
        if (!this.state) throw new Error("Did you run setup?");
    }
}