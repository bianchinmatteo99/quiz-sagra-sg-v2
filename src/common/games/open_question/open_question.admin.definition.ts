import { MDUtils } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { OpenQuestionGameDefinitionData, OpenQuestionGameRequiredData } from "./open_question.contracts";

/** Convenience alias for a fully-typed Open Question game definition instance. */
export type OpenQuestionGameDefinition = GameDefinition<OpenQuestionGameDefinitionData>;

/**
 * Parses and validates {@link OpenQuestionGameDefinitionData} from markdown
 * quiz sections or persisted JSON payloads.
 *
 * Registered in the admin game registry so quiz-definition loading can resolve
 * the `open_question` kind into this builder.
 */
export class OpenQuestionGameDefinitionBuilder implements GameDefinitionBuilder<OpenQuestionGameDefinitionData> {
    /**
     * Parse an Open Question game definition from one markdown section body.
     *
     * Supported keys (snake_case as authored in markdown):
     * - `title` (optional): display title shown before/after rounds.
     * - `limit_trials_per_question` (optional): maximum attempts per question;
     *   defaults to `Number.MAX_SAFE_INTEGER`.
     * - `stop_when_first_hand_raised` (optional): when `true`, answer
     *   collection stops at first submitted answer.
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
    parseFromMD(md: string): OpenQuestionGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "limit_trials_per_question",
            "stop_when_first_hand_raised",
            "questions_and_answers",
            "points_for_correct_answer",
        ], "Open question markdown");

        const title = MDUtils.parseString(parsed, "title", OpenQuestionGameRequiredData.name);
        const limitTrialsPerQuestion = MDUtils.parseNumber(parsed, "limit_trials_per_question", Number.MAX_SAFE_INTEGER);
        const stopWhenFirstHandRaised = MDUtils.parseBoolean(parsed, "stop_when_first_hand_raised", false);
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const questionAndAnswerEntries = MDUtils.parseStringList(parsed, "questions_and_answers");
        const parsedPairs = questionAndAnswerEntries.map((entry, i) => this.parseQuestionAndAnswer(entry, i));

        if (limitTrialsPerQuestion <= 0) {
            throw new Error(`Open question key \"limit_trials_per_question\" must be > 0, received ${limitTrialsPerQuestion}`);
        }
        if (pointsForCorrectAnswer < 0) {
            throw new Error(`Open question key \"points_for_correct_answer\" must be >= 0, received ${pointsForCorrectAnswer}`);
        }
        if (parsedPairs.length < 1) {
            throw new Error(`Open question key \"questions_and_answers\" must have at least 1 item in the list, received ${parsedPairs.length}`);
        }

        return {
            ...OpenQuestionGameRequiredData,
            title,
            limitTrialsPerQuestion,
            stopWhenFirstHandRaised,
            questions: parsedPairs.map((pair) => pair.question),
            correctAnswers: parsedPairs.map((pair) => pair.answer),
            pointsForCorrectAnswer,
        };
    }

    /**
     * Parse an Open Question definition from persisted JSON data.
     *
     * Missing fields are defaulted so older saved definitions remain readable:
     * - `title` -> game default name
     * - `limitTrialsPerQuestion` -> `Number.MAX_SAFE_INTEGER`
     * - `stopWhenFirstHandRaised` -> `false`
     * - `questions` -> `[]`
     * - `correctAnswers` -> `[]`
     * - `pointsForCorrectAnswer` -> `10`
     *
     * @param data Partial serialized definition payload.
     * @returns A complete definition payload for runtime use.
     */
    parseFromJSON(data: Partial<OpenQuestionGameDefinitionData>): OpenQuestionGameDefinitionData {
        return {
            ...OpenQuestionGameRequiredData,
            title: data.title ?? OpenQuestionGameRequiredData.name,
            limitTrialsPerQuestion: data.limitTrialsPerQuestion ?? Number.MAX_SAFE_INTEGER,
            stopWhenFirstHandRaised: data.stopWhenFirstHandRaised ?? false,
            questions: data.questions ?? [],
            correctAnswers: data.correctAnswers ?? [],
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
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
            throw new Error(`Open question key \"questions_and_answers\" item ${index + 1} must match \"question? = answer\", received \"${entry}\"`);
        }

        const question = match[1].trim();
        const answer = match[2].trim();

        if (question.length === 0 || answer.length === 0) {
            throw new Error(`Open question key \"questions_and_answers\" item ${index + 1} cannot have empty question or answer`);
        }

        return { question, answer };
    }
}
