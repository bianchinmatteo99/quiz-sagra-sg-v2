import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { MDUtils } from "../../md.utils";
import { CatenaGameDefinitionData, CatenaGameRequiredData } from "./catena.contracts";

/**
 * Runtime wrapper type for a parsed Catena game definition entry.
 *
 * The wrapper is created by the quiz definition parser after this builder
 * returns a {@link CatenaGameDefinitionData} payload.
 */
export type CatenaGameDefinition = GameDefinition<CatenaGameDefinitionData>;

/**
 * Parses and normalizes Catena game configuration data.
 *
 * This builder is registered under the `catena` key in the game-definition
 * registry and is used by quiz loading flows for both Markdown and persisted
 * JSON sources.
 */
export class CatenaGameDefinitionBuilder implements GameDefinitionBuilder<CatenaGameDefinitionData> {
    /**
     * Parse a Catena game definition from one Markdown game section.
     *
     * Expected section format:
     * - optional scalar keys (`title`, `time_for_answer`,
     *   `can_retry_for_same_word`, `points_for_correct_answer`),
     * - `words:` followed by list items (`- value`).
     *
     * Blank lines are ignored. Unknown keys are logged by default.
     *
     * @param md Markdown text for Catena section content only (without `##` title).
     * @returns Normalized Catena definition payload with enforced `kind`/`name`
     * and default values when optional keys are missing.
      * @throws Error When markdown content does not match Catena contract.
     */
    parseFromMD(md: string): CatenaGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "time_for_answer",
            "can_retry_for_same_word",
            "words",
            "points_for_correct_answer",
        ], "Catena markdown");

        const title = MDUtils.parseString(parsed, "title", CatenaGameRequiredData.name);
        const timeForAnswer = MDUtils.parseNumber(parsed, "time_for_answer", 0);
        const canRetryForSameWord = MDUtils.parseBoolean(parsed, "can_retry_for_same_word", true);
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer", 10);
        const words = MDUtils.parseStringList(parsed, "words");

        if (timeForAnswer < 0) {
            throw new Error(`Catena key \"time_for_answer\" must be >= 0, received ${timeForAnswer}`);
        }
        if (pointsForCorrectAnswer < 0) {
            throw new Error(`Catena key \"points_for_correct_answer\" must be >= 0, received ${pointsForCorrectAnswer}`);
        }

        return {
            ...CatenaGameRequiredData,
            title,
            timeForAnswer,
            canRetryForSameWord,
            words,
            pointsForCorrectAnswer,
        };
    }

    /**
     * Restore a Catena game definition from persisted JSON-like data.
     *
     * The parser applies defensive coercions used by the quiz-definition
     * restoration flow:
     * - numeric fields are converted with `Number`,
     * - `canRetryForSameWord` is true only for strict boolean `true`,
     * - `words` is normalized to an array of strings,
     * - `title` is included only when it is a non-empty string.
     *
     * @param data Raw stored payload from `/definition/games`.
     * @returns Normalized Catena definition payload with enforced `kind`/`name`
     * and fallback defaults for missing fields.
     */
    parseFromJSON(data: Partial<CatenaGameDefinitionData>): CatenaGameDefinitionData {
        return {
            ...CatenaGameRequiredData,
            title: data.title ?? CatenaGameRequiredData.name,
            timeForAnswer: data.timeForAnswer ?? 0,
            canRetryForSameWord: data.canRetryForSameWord ?? true,
            words: data.words ?? [],
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
        };
    }
}
