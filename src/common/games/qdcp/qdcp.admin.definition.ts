import { MDUtils } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { QDCPGameDefinitionData, QDCPGameRequiredData } from "./qdcp.contracts";

/** Convenience alias for a fully-typed QDCP game definition instance. */
export type QDCPGameDefinition = GameDefinition<QDCPGameDefinitionData>;

/**
 * Parses and validates a QDCP game definition from either markdown or JSON.
 *
 * Registered in games.admin.register.ts under the qdcp kind so quiz-definition
 * loading can resolve the correct builder for this game.
 */
export class QDCPGameDefinitionBuilder implements GameDefinitionBuilder<QDCPGameDefinitionData> {
    /**
     * Parse one QDCP game section from markdown content.
     *
     * Supported markdown keys:
     * - title (optional)
     * - limit_trials_per_section (optional, defaults to Number.MAX_SAFE_INTEGER)
     * - stop_when_first_hand_raised (optional, defaults to false)
     * - points_for_correct_answer (required, must be >= 0)
     * - hints_and_answers (required list; each item must contain 5 parts)
     *
     * Each hints_and_answers entry is split by | or = and must contain exactly
     * 5 non-empty segments in order to match the game runtime structure.
     *
     * @param md Raw markdown section content for the qdcp block.
     * @returns Normalized QDCP definition payload.
     * @throws Error When keys are invalid, required values are missing, or
     * constraints are violated.
     */
    parseFromMD(md: string): QDCPGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "limit_trials_per_section",
            "stop_when_first_hand_raised",
            "hints_and_answers",
            "points_for_correct_answer",
        ], "QDCP markdown");

        const title = MDUtils.parseString(parsed, "title", QDCPGameRequiredData.name);
        const limitTrialsPerSection = MDUtils.parseNumber(parsed, "limit_trials_per_section", Number.MAX_SAFE_INTEGER);
        const stopWhenFirstHandRaised = MDUtils.parseBoolean(parsed, "stop_when_first_hand_raised", false);
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const hintsAndAnswers = MDUtils.parseStringList(parsed, "hints_and_answers").map((line, index) => {
            const parsedLine = this.parseHintsAndAnswersLine(line);
            if (parsedLine.length !== 5) {
                throw new Error(`QDCP key "hints_and_answers" entry at index ${index} must contain 5 parts separated by "|" or "="`);
            }
            return parsedLine;
        });

        if (limitTrialsPerSection <= 0) {
            throw new Error(`QDCP key "limit_trials_per_section" must be > 0, received ${limitTrialsPerSection}`);
        }
        if (pointsForCorrectAnswer < 0) {
            throw new Error(`QDCP key "points_for_correct_answer" must be >= 0, received ${pointsForCorrectAnswer}`);
        }
        if (hintsAndAnswers.length === 0) {
            throw new Error('QDCP key "hints_and_answers" must contain at least one item');
        }

        return {
            ...QDCPGameRequiredData,
            title,
            limitTrialsPerSection,
            stopWhenFirstHandRaised,
            hintsAndAnswers,
            pointsForCorrectAnswer,
        };
    }

    /**
     * Restore a QDCP game definition from persisted JSON-like data.
     *
     * Missing optional fields are replaced with stable defaults so older
     * snapshots can still be loaded by the runtime.
     *
     * @param data Partial stored payload from definition persistence.
     * @returns Fully populated QDCP definition payload.
     */
    parseFromJSON(data: Partial<QDCPGameDefinitionData>): QDCPGameDefinitionData {
        return {
            ...QDCPGameRequiredData,
            title: data.title ?? QDCPGameRequiredData.name,
            limitTrialsPerSection: data.limitTrialsPerSection ?? Number.MAX_SAFE_INTEGER,
            stopWhenFirstHandRaised: data.stopWhenFirstHandRaised ?? false,
            hintsAndAnswers: data.hintsAndAnswers ?? [],
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
        };
    }

    /**
     * Split and validate one hints_and_answers markdown line.
     *
     * The line accepts both | and = separators and trims all segments.
     * Empty segments are rejected to avoid ambiguous display/runtime behavior.
     *
     * @param line Single list item from hints_and_answers.
     * @returns Trimmed segments extracted from the input line.
     * @throws Error When at least one segment is empty.
     */
    private parseHintsAndAnswersLine(line: string): string[] {
        const parts = line
            .split(/[|=]/)
            .map((part) => part.trim());

        if (parts.some((part) => part.length === 0)) {
            throw new Error(`QDCP key "hints_and_answers" cannot contain empty parts in "${line}"`);
        }

        return parts;
    }
}
