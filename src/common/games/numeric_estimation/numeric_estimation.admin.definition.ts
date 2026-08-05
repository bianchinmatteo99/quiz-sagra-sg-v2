import { MDUtils } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { NumericEstimationGameDefinitionData, NumericEstimationGameRequiredData } from "./numeric_estimation.contracts";


/** Convenience alias for a fully-typed Numeric Estimation game definition instance. */
export type NumericEstimationGameDefinition = GameDefinition<NumericEstimationGameDefinitionData>;

/**
 * Parses and validates numeric estimation definition data from markdown
 * quiz sections or persisted JSON payloads.
 *
 * Registered in the admin game registry so quiz-definition loading can resolve
 * the `numeric_estimation` kind into this builder.
 */
export class NumericEstimationGameDefinitionBuilder implements GameDefinitionBuilder<NumericEstimationGameDefinitionData> {
    /**
     * Parse a Numeric Estimation game definition from one markdown section body.
     *
     * Supported keys (snake_case as authored in markdown):
     * - `title` (optional): display title shown before/after rounds.
    * - `time_for_question` (optional): seconds available for each question;
    *   defaults to `0`.
    * - `if_no_correct_answers` (optional): fallback scoring policy when no
    *   answer is exactly correct. Defaults to empty string.
     * - `questions_and_answers` (required): list of entries in
     *   `question? = answer` format.
     * - `points_for_correct_answer` (required): score awarded to each correct
     *   participant answer.
     *
     * The `questions_and_answers` list is normalized into two aligned arrays:
     * `questions[i]` and `correctAnswers[i]` refer to the same round.
     *
     * @param md Raw markdown content of the game section.
     * @returns A fully populated and validated game definition payload.
     * @throws {Error} If required keys are missing, constraints fail, or a
     * `questions_and_answers` entry does not match `question? = answer`.
     */
    parseFromMD(md: string): NumericEstimationGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "time_for_question",
            "if_no_correct_answers",
            "questions_and_answers",
            "points_for_correct_answer",
            // Backward-compat keys for old persisted markdown.
            "limit_trials_per_question",
            "stop_when_first_hand_raised",
        ], "Numeric estimation markdown");

        const title = MDUtils.parseString(parsed, "title", NumericEstimationGameRequiredData.name);
        const timeForQuestion = MDUtils.parseNumber(parsed, "time_for_question", 0);
        const ifNoCorrectAnswers = MDUtils.parseString(parsed, "if_no_correct_answers", "") as NumericEstimationGameDefinitionData["ifNoCorrectAnswers"];
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const questionAndAnswerEntries = MDUtils.parseStringList(parsed, "questions_and_answers");
        const parsedPairs = questionAndAnswerEntries.map((entry, i) => this.parseQuestionAndAnswer(entry, i));

        if (timeForQuestion < 0) {
            throw new Error(`Numeric estimation key \"time_for_question\" must be >= 0, received ${timeForQuestion}`);
        }
        if (!["", "half-points-to-closest", "linear-decreasing-points"].includes(ifNoCorrectAnswers)) {
            throw new Error(`Numeric estimation key \"if_no_correct_answers\" has invalid value \"${ifNoCorrectAnswers}\"`);
        }
        if (pointsForCorrectAnswer < 0) {
            throw new Error(`Numeric estimation key \"points_for_correct_answer\" must be >= 0, received ${pointsForCorrectAnswer}`);
        }
        if (parsedPairs.length < 1) {
            throw new Error(`Numeric estimation key \"questions_and_answers\" must have at least 1 item in the list, received ${parsedPairs.length}`);
        }

        return {
            ...NumericEstimationGameRequiredData,
            title,
            timeForQuestion,
            ifNoCorrectAnswers,
            questions: parsedPairs.map((pair) => pair.question),
            correctAnswers: parsedPairs.map((pair) => pair.answer),
            pointsForCorrectAnswer,
        };
    }

    /**
     * Parse a Numeric Estimation definition from persisted JSON data.
     *
     * Missing fields are defaulted so older saved definitions remain readable:
     * - `title` -> game default name
    * - `timeForQuestion` -> `0`
    * - `ifNoCorrectAnswers` -> `""`
     * - `questions` -> `[]`
     * - `correctAnswers` -> `[]`
     * - `pointsForCorrectAnswer` -> `10`
     *
     * @param data Partial serialized definition payload.
     * @returns A complete definition payload for runtime use.
     */
    parseFromJSON(data: Partial<NumericEstimationGameDefinitionData>): NumericEstimationGameDefinitionData {
        const parsed = data as Partial<NumericEstimationGameDefinitionData>

        return {
            ...NumericEstimationGameRequiredData,
            title: parsed.title ?? NumericEstimationGameRequiredData.name,
            timeForQuestion: parsed.timeForQuestion ?? 0,
            ifNoCorrectAnswers: parsed.ifNoCorrectAnswers ?? "",
            questions: parsed.questions ?? [],
            correctAnswers: parsed.correctAnswers ?? [],
            pointsForCorrectAnswer: parsed.pointsForCorrectAnswer ?? 10,
        };
    }

    /**
     * Parse one markdown list entry using the `question? = answer` contract.
     *
     * The first capture group keeps the trailing `?` as authored, while the
     * second capture group stores the expected answer text.
     *
     * @param entry Raw list item text.
     * @param index Zero-based item index, used for diagnostic messages.
     * @returns Normalized question/answer pair.
     * @throws {Error} If the entry format is invalid or either side is empty.
     */
    private parseQuestionAndAnswer(entry: string, index: number): { question: string; answer: string; } {
        const match = entry.match(/^(.+\?)\s*=\s*(.+)$/);
        if (!match) {
            throw new Error(`Numeric estimation key \"questions_and_answers\" item ${index + 1} must match \"question? = answer\", received \"${entry}\"`);
        }

        const question = match[1]!.trim();
        const answer = match[2]!.trim();

        if (question.length === 0 || answer.length === 0) {
            throw new Error(`Numeric estimation key \"questions_and_answers\" item ${index + 1} cannot have empty question or answer`);
        }

        return { question, answer };
    }
}
