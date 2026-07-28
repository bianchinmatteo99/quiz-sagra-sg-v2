import { Ender, Evaluator, Question, QuestionContext, QuestionModel } from "../questions.admin.base";

/**
 * Model for a text input question variant.
 *
 * Persists the metadata and lifecycle state for open-ended text response questions.
 * This is registered as "text-input" and displayed to participants as "Risposta testuale".
 */
class TextInputQuestionModel extends QuestionModel{
    /** Registry identifier persisted in `/state/question.kind`. */
    readonly kind = "text-input";
    /** Human-readable label shown in admin, display, and presenter views. */
    readonly name = "Risposta testuale";
}

/**
 * Question implementation for open-ended text input responses.
 *
 * Orchestrates the lifecycle of a text input question, including answer collection,
 * evaluation (auto or manual), and result display. Participants submit free-form text
 * which can be evaluated using string comparison or custom predicates.
 */
export class TextInputQuestion extends Question {
    /** Concrete model instance backing this text-input question lifecycle. */
    readonly model : TextInputQuestionModel;

    /**
     * Creates a text input question instance.
     *
     * The base class normalizes auto-evaluation (for example exact-match
     * string comparison) and configures stop conditions; this constructor
     * only binds the text-input model and optional deny-list.
     *
     * @param ctx Application context with database and people list.
     * @param evaluate Auto/manual evaluation configuration (e.g., exact match string or predicate).
     * @param stopAnswersCriteria Conditions for ending the answer collection phase (timer, manual stop, or custom predicate).
     * @param deny Optional list of participant ids who cannot submit an answer to this question.
     */
    constructor(ctx: QuestionContext, evaluate: Evaluator, stopAnswersCriteria: Ender, deny: string[]=[]){
        super(ctx, evaluate, stopAnswersCriteria);
        this.model = new TextInputQuestionModel(this, deny);
    }

}
