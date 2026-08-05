import { Ender, Evaluator, Question, QuestionContext, QuestionModel } from "../questions.admin.base";

/**
 * Model for a four-option multiple-choice question.
 */
class MultipleChoiceQuestionModel extends QuestionModel {
    /** Registry identifier persisted in `/state/question.kind`. */
    readonly kind = "multiple-choice";
    /** Human-readable label shown in admin, display, and presenter views. */
    readonly name = "Scelta multipla";
}

/**
 * Question implementation for multiple-choice answers (A/B/C/D).
 */
export class MultipleChoiceQuestion extends Question {
    /** Concrete model instance backing this question lifecycle. */
    readonly model: MultipleChoiceQuestionModel;

    /**
     * Creates a multiple-choice question instance.
     *
     * Answers are still persisted as strings by the shared question runtime,
     * while this type customizes the user input UI to provide A/B/C/D buttons.
     */
    constructor(ctx: QuestionContext, evaluate: Evaluator, stopAnswersCriteria: Ender, deny: string[] = []) {
        super(ctx, evaluate, stopAnswersCriteria);
        this.model = new MultipleChoiceQuestionModel(this, deny);
    }
}
