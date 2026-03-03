import { CancelHandle } from "../general.interfaces";

export interface IDatabaseAdapter {
    get<T>(path: string): Promise<T | null>;
    onValue<T>(path: string, callback: (value: T | null) => void): CancelHandle;
    set<T>(path: string, value: T): Promise<void>;
    update<T>(path: string, value: Partial<T>): Promise<void>;
    remove(path: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// AppState — local definition where qoptions and game are intentionally `any`
// so that concrete example objects can compile without requiring registry
// augmentations.
// ---------------------------------------------------------------------------

export type GlobalGameState =
    | "initial"
    | "inactive"
    | "waiting"
    | "asking"
    | "showing_results";

export interface GlobalState {
    gstate: GlobalGameState;
}

export interface QuestionState {
    timer: number;
    qstate: "empty" | "ready" | "active" | "closed";
    qoptions?: any;
}

export interface EvaluationsState {
    style: string;
    [uid: string]: any;
}

export interface UserState {
    name: string;
    score: number;
}

/** AppState — qoptions and game are typed as `any` for flexibility. */
export interface AppState {
    global: GlobalState;
    question: QuestionState;
    /** Game node — shape depends on the active game type. */
    game: any;
    users: Record<string, UserState>;
    answers: Record<string, any>;
    evaluations: EvaluationsState;
}