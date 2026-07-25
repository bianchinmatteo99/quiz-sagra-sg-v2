/**
 * State machine values for a running question.
 */
export enum QuestionState {
    SETUP,
    ASKING,
    EVALUATING,
    IDLE,
    SHOWRESULTS,
    ENDED,
}
