import { QuestionStateSnapshot } from "../question.contract";
import { QuestionModelSnapshot } from "../questions.admin.base";

/**
 * Serialized state persisted under `/state/question` for select questions.
 */
export interface SelectQuestionStateSnapshot extends QuestionStateSnapshot {
    /** Allowed answers shown in the user select input. */
    possibleWords: string[];
}

/**
 * Serialized model payload used by select question models.
 */
export interface SelectQuestionModelSnapshot extends QuestionModelSnapshot {
    question?: SelectQuestionStateSnapshot;
}
