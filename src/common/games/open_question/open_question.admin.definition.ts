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
    * - `time_for_answer` (optional): answer collection timeout in seconds;
    *   `0` disables the timer.
     * - `questions_and_answers` (required): list of entries in
    *   `question = answer` format.
     * - `points_for_correct_answer` (required): score awarded to each correct
     *   participant answer.
     *
     * The `questions_and_answers` list is normalized into two aligned arrays:
     * `questions[i]` and `correctAnswers[i]` refer to the same round.
     *
     * @param md Raw markdown content of the game section.
     * @returns A fully populated and validated game definition payload.
     * @throws {Error} If required keys are missing, constraints fail, or a
    * `questions_and_answers` entry does not match `question = answer`.
     */
    parseFromMD(md: string): OpenQuestionGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "time_for_answer",
            "questions_and_answers",
            "points_for_correct_answer",
        ], "Open question markdown");

        const title = MDUtils.parseString(parsed, "title", OpenQuestionGameRequiredData.name);
        const timeForAnswer = MDUtils.parseNumber(parsed, "time_for_answer", 0);
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const questionAndAnswerEntries = MDUtils.parseStringList(parsed, "questions_and_answers");
        const parsedPairs = questionAndAnswerEntries.map((entry, i) => this.parseQuestionAndAnswer(entry, i));

        if (timeForAnswer < 0) {
            throw new Error(`Open question key \"time_for_answer\" must be >= 0, received ${timeForAnswer}`);
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
            timeForAnswer,
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
    * - `timeForAnswer` -> `0`
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
            timeForAnswer: data.timeForAnswer ?? 0,
            questions: data.questions ?? [],
            correctAnswers: data.correctAnswers ?? [],
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
        };
    }

    /**
     * Parse one markdown list entry using the `question = answer` contract.
     *
     * A trailing `?` in the question text is allowed but not required.
     * The first capture group stores the question text as authored, while the
     * second capture group stores the expected answer text.
     *
     * @param entry Raw list item text.
     * @param index Zero-based item index, used for diagnostic messages.
     * @returns Normalized question/answer pair.
     * @throws {Error} If the entry format is invalid or either side is empty.
     */
    private parseQuestionAndAnswer(entry: string, index: number): { question: string; answer: string; } {
        const match = entry.match(/^(.+)\s*=\s*(.+)$/);
        if (!match) {
            throw new Error(`Open question key \"questions_and_answers\" item ${index + 1} must match \"question = answer\", received \"${entry}\"`);
        }

        const question = match[1]!.trim();
        const answer = match[2]!.trim();

        if (question.length === 0 || answer.length === 0) {
            throw new Error(`Open question key \"questions_and_answers\" item ${index + 1} cannot have empty question or answer`);
        }

        return { question, answer };
    }
}
