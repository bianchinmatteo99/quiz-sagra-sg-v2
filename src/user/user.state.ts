import { Auth, onAuthStateChanged, signInAnonymously } from "firebase/auth"
import { IDatabaseAdapter } from "../common/database/database.types"
import { CancelHandle } from "../common/general.utils"
import { QuestionState } from "../common/questions/question.base"
import { QuizStatus } from "../common/quiz/quiz.model"

/**
 * Shared application state values the user UI consumes.
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
 * Combined state exposed by the user-facing application.
 */
export type UserState = { app: AppState, person: PersonState, questionresult: boolean|null, currentDecisionLeaf: string }

/**
 * Handles user authentication, realtime state subscriptions, and answer submission.
 *
 * Keeps a normalized view of app state, current person metadata, and last question result.
 */
export class UserStateHandler {
    static readonly APPSTATEPATH = "/state"
    static readonly PERSONPATH = "/people/list"
    static readonly RESULTSPATH = "/results/evaluation"
    static readonly ANSWERSPATH = "/results/answers"
    private db: IDatabaseAdapter;
    private auth: Auth;
    private state?: UserState;
    /**
     * Read-only access to the current user state.
     */
    get read(){
        return this.state;
    }
    private _bindingCancel: CancelHandle[] = [];

    /**
     * @param db - Database adapter for realtime updates and writes.
     * @param auth - Firebase auth instance used for anonymous sign-in and current user lookup.
     */
    constructor(db: IDatabaseAdapter, auth: Auth) {
        this.db = db;
        this.auth = auth;
    }

    private pending = false;
    private observers : Set<(state : UserState)=>void> = new Set();

    /**
     * Subscribe to state changes and receive the current state immediately if available.
     *
     * @param o - Observer callback invoked when state updates.
     * @returns Cancel handle to remove the observer.
     */
    addObserver(o:(state : UserState)=>void): CancelHandle{
        this.observers.add(o);
        if(!!this.state) o(this.state);
        return ()=>this.observers.delete(o);
    }

    /**
     * Queue a microtask to notify observers after state mutations.
     *
     * Avoids duplicate notifications when multiple updates occur in rapid succession.
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
     * Initialize state subscriptions and await Firebase auth readiness.
     *
     * This method must be called once before using the handler.
     */
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
    /**
     * Attach Firebase listeners for the current user's person record and evaluation result.
     *
     * Must be called after login.
     */
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
    /**
     * Ensure the current user is signed in and register their display name.
     *
     * If no anonymous auth session exists, this method signs in anonymously first.
     * @param name - Team name to store for the current person record.
     */
    async registerWithName(name: string) {
        this.requiresSetup();
        let id = this.getUserId();
        if (!id) {
            id = (await signInAnonymously(this.auth)).user.uid;
            this.setupPersonListener();
        }
        await this.db.update(this.getPersonPath(id), { "name": name });
    }
    /**
     * Submit the current user's answer for the active question.
     *
     * Throws if the user is not registered or if question state is unavailable.
     * @param answer - The answer text to store.
     */
    async answerQuestion(answer: string) {
        this.requiresSetup();
        if (!this.isRegisteredToQuiz()) throw new Error("User must be registered to quiz before answering questions");
        if (!this.state?.app.question) throw new Error("Question state is undefined");
        await this.db.set(`${UserStateHandler.ANSWERSPATH}/${this.getUserId()}`, { time: new Date(Date.now()).toISOString(), answer: answer });
        this.scheduleUpdate();
    }
    /**
     * Determine whether a Firebase auth session exists.
     */
    isLoggedIn(): boolean {
        return !!this.getUserId();
    }
    /**
     * Get the current Firebase user ID.
     */
    getUserId(): string | null {
        return this.auth.currentUser?.uid ?? null
    }
    /**
     * Build the database path for a specific user record.
     */
    getPersonPath(id: string): string {
        return `${UserStateHandler.PERSONPATH}/${id}`
    }
    /**
     * Return true when a user record exists in the current state.
     */
    isRegisteredToQuiz(): boolean {
        return !!this.state?.person
    }
    /**
     * Get the current registered team name if available.
     */
    getName(): string | null {
        this.requiresSetup();
        return this.isRegisteredToQuiz() ? this.state?.person?.name ?? "" : null
    }
    /**
     * Update the current decision tree leaf path for diagnostics.
     *
     * @param path - Decision node path prefix.
     * @param pagename - Name of the selected leaf.
     */
    setCurrentPath(path:string, pagename:string){
        this.state!.currentDecisionLeaf = path+">"+pagename;
        console.log(this.state!.currentDecisionLeaf);
    }
    /**
     * Ensure state has been initialized before using handlers.
     *
     * Throws when `setup()` has not yet completed.
     */
    requiresSetup() {
        if (!this.state) throw new Error("Did you run setup?");
    }
}