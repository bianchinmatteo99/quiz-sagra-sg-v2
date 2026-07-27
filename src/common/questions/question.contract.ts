/**
 * Lifecycle states used by a question while it is active in the quiz flow.
 *
 * These values are persisted in the realtime snapshot at `/state/question`
 * and consumed by admin, user, display, and presenter clients to select
 * the appropriate UI and behavior for the current phase.
 */
export enum QuestionState {
    /** Question has been created and prepared but is not yet accepting answers. */
    SETUP,
    /** Participants can submit answers. */
    ASKING,
    /** Answer collection has ended and evaluation is in progress. */
    EVALUATING,
    /** Transitional waiting state used while remaining in evaluation flow. */
    IDLE,
    /** Evaluation has completed and results are visible to clients. */
    SHOWRESULTS,
    /** Question lifecycle is complete and the flow can continue. */
    ENDED,
}

/**
 * In-memory answer collection keyed by participant id.
 *
 * The `time` field is represented as a {@link Date} at runtime, while the
 * persisted snapshot stores the same value as an ISO string.
 */
export type QuestionAnswers = Map<string, { time: Date, answer: string }>;

/**
 * In-memory evaluation results keyed by participant id.
 *
 * Each value indicates whether the participant answer is considered correct.
 */
export type QuestionResult = Map<string, boolean>;

/**
 * Serialized question state persisted under `/state/question`.
 */
export interface QuestionStateSnapshot {
    /** Registered question kind identifier (for example `text-input`). */
    name: string;
    /** Human-readable question label used in views. */
    displayName: string;
    /** Current lifecycle state shared across clients. */
    state: QuestionState;
    /** Participant ids that are not allowed to submit an answer. */
    deny: string[];
    /** Whether new participant answers are currently accepted. */
    enableAnswers: boolean;
    /** Whether manual answer validation is enabled in admin controls. */
    enableManualEvaluation: boolean;
}

/**
 * Serialized answers persisted under `/results/answers`.
 *
 * Keys are participant ids and values include answer text and submission time.
 */
export type QuestionAnswersSnapshot = Record<string, { time: string, answer: string }>;

/**
 * Serialized evaluation results persisted under `/results/evaluation`.
 *
 * Keys are participant ids and values indicate correctness.
 */
export type QuestionResultSnapshot = Record<string, boolean>;

/**
 * Aggregate result snapshot persisted under `/results`.
 *
 * Branches are optional because writes can happen in phases (answers first,
 * evaluation later) and readers must tolerate partial payloads.
 */
export interface QuestionResultsSnapshot {
    /** Participant answers indexed by participant id. */
    answers?: QuestionAnswersSnapshot;
    /** Evaluation outcome indexed by participant id. */
    evaluation?: QuestionResultSnapshot;
}