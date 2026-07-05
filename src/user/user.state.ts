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

export type UserState = { app: AppState, person: PersonState, questionresult: boolean|null, currentDecisionLeaf: string }

export class UserStateHandler {
    static readonly APPSTATEPATH = "/state"
    static readonly PERSONPATH = "/people/list"
    static readonly RESULTSPATH = "/results/evaluation"
    static readonly ANSWERSPATH = "/results/answers"
    private db: IDatabaseAdapter;
    private auth: Auth;
    private state?: UserState;
    get read(){
        return this.state;
    }
    private _bindingCancel: CancelHandle[] = [];

    constructor(db: IDatabaseAdapter, auth: Auth) {
        this.db = db;
        this.auth = auth;
    }

    private pending = false;
    private observers : Set<(state : UserState)=>void> = new Set();

    addObserver(o:(state : UserState)=>void): CancelHandle{
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
        this._bindingCancel.push(this.db.onValue<AppState>(UserStateHandler.APPSTATEPATH, (data) => {
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
        this._bindingCancel.push(this.db.onValue<boolean | null>(`${UserStateHandler.RESULTSPATH}/${this.getUserId()}`, (data) => {
            this.state!.questionresult = data ?? null;
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
    async answerQuestion(answer: string) {
        this.requiresSetup();
        if (!this.isRegisteredToQuiz()) throw new Error("User must be registered to quiz before answering questions");
        if (!this.state?.app.question) throw new Error("Question state is undefined");
        await this.db.set(`${UserStateHandler.ANSWERSPATH}/${this.getUserId()}`, { time: new Date(Date.now()).toISOString(), answer: answer });
        this.scheduleUpdate();
    }
    isLoggedIn(): boolean {
        return !!this.getUserId();
    }
    getUserId(): string | null {
        return this.auth.currentUser?.uid ?? null
    }
    getPersonPath(id: string): string {
        return `${UserStateHandler.PERSONPATH}/${id}`
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
        console.log(this.state!.currentDecisionLeaf);
    }
    requiresSetup() {
        if (!this.state) throw new Error("Did you run setup?");
    }
}