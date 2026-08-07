import { Ender, Evaluator, Question, QuestionContext, QuestionModel } from "../questions.admin.base";
import { SelectQuestionModelSnapshot } from "./select.question.contract";

/**
 * Model for a select question with predefined answer words.
 */
class SelectQuestionModel extends QuestionModel {
    /** Registry identifier persisted in `/state/question.kind`. */
    readonly kind = "select";
    /** Human-readable label shown in admin, display, and presenter views. */
    readonly name = "Selezione";
    /** Allowed words users can choose from when answering. */
    possibleWords: string[];

    constructor(ctx: Question, possibleWords: string[], deny: string[] = []) {
        super(ctx, deny);
        this.possibleWords = [...possibleWords];
    }

    parseFromJSON(data: Partial<SelectQuestionModelSnapshot>): boolean {
        const parsed = super.parseFromJSON(data);
        const words = data?.question?.possibleWords;
        if (Array.isArray(words)) {
            this.possibleWords = words.filter((value): value is string => typeof value === "string");
            return true;
        }
        return parsed;
    }

    toJSON(): SelectQuestionModelSnapshot {
        const base = super.toJSON();
        return {
            results: base.results,
            question: {
                kind: this.kind,
                name: this.name,
                state: this.state,
                deny: this.deny,
                enableAnswers: this.enableAnswers,
                enableManualEvaluation: this.enableManualEvaluation,
                possibleWords: [...this.possibleWords],
            },
        };
    }
}

/**
 * Question implementation where users answer by selecting from a predefined list.
 */
export class SelectQuestion extends Question {
    /** Concrete model instance backing this select question lifecycle. */
    readonly model: SelectQuestionModel;

    /**
     * Creates a select question instance.
     *
     * @param ctx Application context with database and people list.
     * @param evaluate Auto/manual evaluation configuration.
     * @param stopAnswersCriteria Conditions for ending the answer collection phase.
     * @param possibleWords List of words users can select as answer.
     * @param deny Optional list of participant ids who cannot submit an answer.
     */
    constructor(ctx: QuestionContext, evaluate: Evaluator, stopAnswersCriteria: Ender, possibleWords: string[], deny: string[] = []) {
        super(ctx, evaluate, stopAnswersCriteria);
        this.model = new SelectQuestionModel(this, possibleWords, deny);
    }
}
