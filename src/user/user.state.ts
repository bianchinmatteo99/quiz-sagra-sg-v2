import { Auth, onAuthStateChanged, signInAnonymously } from "firebase/auth"
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

export type State = { app: AppState, person: PersonState, currentDecisionLeaf: string }

export class StateHandler {
    static readonly APPSTATEPATH = "/state"
    static readonly PERSONPATH = "/people/list"
    private db: IDatabaseAdapter;
    private auth: Auth;
    private state?: State;
    get read(){
        return Object.freeze(this.state);
    }
    private _bindingCancel: CancelHandle[] = [];

    constructor(db: IDatabaseAdapter, auth: Auth) {
        this.db = db;
        this.auth = auth;
    }

    private pending = false;
    private observers : Set<(state : State)=>void> = new Set();

    addObserver(o:(state : State)=>void): CancelHandle{
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
        this.state = { app: { quiz: { status: QuizStatus.Booting } }, person: null, currentDecisionLeaf: "" };
        this._bindingCancel.push(this.db.onValue<AppState>(StateHandler.APPSTATEPATH, (data) => {
            if (data !== null && data !== undefined) {
                this.state!.app = data;
                this.scheduleUpdate();
            }
        }));
        await new Promise<void>((resolve) => {
            const unsubscribe = onAuthStateChanged(this.auth, () => {
                unsubscribe();
                resolve();
            });
        });
        if (this.isLoggedIn()) this.setupPersonListener();
    }
    setupPersonListener() {
        this.requiresSetup();
        if (!this.isLoggedIn()) throw new Error("User must login before listening to person updates");
        this._bindingCancel.push(this.db.onValue<PersonState | null>(this.getPersonPath(this.getUserId()!), (data) => {
            this.state!.person = data;
            this.scheduleUpdate();
        }));
    }
    async registerWithName(name: string) {
        this.requiresSetup();
        let id = this.getUserId();
        if (!id) {
            id = (await signInAnonymously(this.auth)).user.uid;
            this.setupPersonListener();
        }
        await this.db.update(this.getPersonPath(id), { "name": name });
    }
    isLoggedIn(): boolean {
        return !!this.getUserId();
    }
    getUserId(): string | null {
        return this.auth.currentUser?.uid ?? null
    }
    getPersonPath(id: string): string {
        return `${StateHandler.PERSONPATH}/${id}`
    }
    isRegisteredToQuiz(): boolean {
        return !!this.state?.person
    }
    getName(): string | null {
        this.requiresSetup();
        return this.isRegisteredToQuiz() ? this.state?.person?.name ?? "" : null
    }
    setCurrentPath(path:string, pagename:string){
        this.state!.currentDecisionLeaf = path+">"+pagename;
    }
    requiresSetup() {
        if (!this.state) throw new Error("Did you run setup?");
    }
}