import { MDUtils, ParsedSectionContent } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { GuessWordGameDefinitionData, GuessWordGameRequiredData } from "./guess_word.contract";

/** Convenience alias for a fully-typed Guess Word game definition instance. */
export type GuessWordGameDefinition = GameDefinition<GuessWordGameDefinitionData>;

/**
 * Parses and normalizes Guess Word game configuration data.
 *
 * This builder is registered under the `guess_word` key in the game-definition
 * registry and is used by quiz loading flows for both Markdown and persisted
 * JSON sources.
 */
export class GuessWordGameDefinitionBuilder implements GameDefinitionBuilder<GuessWordGameDefinitionData> {
    /**
     * Parse a Guess Word game definition from one Markdown game section.
     *
     * Recognised keys (snake_case as they appear in markdown):
     * - `title` *(optional)* — display title; defaults to `"Indovina la parola"`.
     * - `stop_at_first_correct_answer` *(optional)* — whether answer collection
     *   stops automatically after the first correct answer; defaults to `true`.
     * - `correct_answers` *(required)* — ordered list of accepted answers, one
     *   per round; must contain at least one entry.
     * - `points_for_correct_answer` *(required)* — points awarded for a correct
     *   answer; must be `>= 0`.
    * - `delay_between_letter_display` *(optional)* — seconds between
     *   automatic letter reveals, or `false` to disable automatic progression.
     * - `same_letters_policy` *(optional)* — reveal behavior for repeated
     *   letters; allowed values are `separate`, `together`, and `default`.
     *
     * Unknown keys are reported by {@link MDUtils.ensureOnlyAllowedKeys}.
     *
     * @param md Raw markdown section content for this game block.
     * @returns A fully populated {@link GuessWordGameDefinitionData} object.
     * @throws {Error} If a required key is missing, a value fails validation,
     * or a constrained option contains an unsupported value.
     */
    parseFromMD(md: string): GuessWordGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "stop_at_first_correct_answer",
            "correct_answers",
            "points_for_correct_answer",
            "delay_between_letter_display",
            "same_letters_policy",
        ], "Guess word markdown");

        const title = MDUtils.parseString(parsed, "title", GuessWordGameRequiredData.name);
        const stopAtFirstCorrectAnswer = MDUtils.parseBoolean(parsed, "stop_at_first_correct_answer", true);
        const correctAnswers = MDUtils.parseStringList(parsed, "correct_answers");
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const delayBetweenLetterDisplay = this.parseDelayBetweenLetterDisplay(parsed);
        const sameLettersPolicy = this.parseSameLettersPolicy(parsed);

        if (pointsForCorrectAnswer < 0) {
            throw new Error(`Guess word key \"points_for_correct_answer\" must be >= 0, received ${pointsForCorrectAnswer}`);
        }
        if (correctAnswers.length < 1) {
            throw new Error(`Guess word key \"correct_answers\" must have at least 1 item in the list, received ${correctAnswers.length}`);
        }

        return {
            ...GuessWordGameRequiredData,
            title,
            stopAtFirstCorrectAnswer,
            correctAnswers,
            pointsForCorrectAnswer,
            delayBetweenLetterDisplay,
            sameLettersPolicy,
        };
    }

    /**
     * Deserialises a {@link GuessWordGameDefinitionData} from a plain object,
     * typically read from `/definition` in the Firebase Realtime Database.
     *
     * Missing fields are replaced with safe defaults so older stored
     * definitions can still be loaded:
     * - `title` → `"Indovina la parola"`
     * - `stopAtFirstCorrectAnswer` → `false`
     * - `correctAnswers` → `[]`
     * - `pointsForCorrectAnswer` → `10`
     * - `delayBetweenLetterDisplay` → `false`
     * - `sameLettersPolicy` → validated through the same normalization path
     *
     * @param data Partial JSON object to deserialise.
     * @returns A fully populated {@link GuessWordGameDefinitionData} object.
     */
    parseFromJSON(data: Partial<GuessWordGameDefinitionData>): GuessWordGameDefinitionData {
        return {
            ...GuessWordGameRequiredData,
            title: data.title ?? GuessWordGameRequiredData.name,
            stopAtFirstCorrectAnswer: data.stopAtFirstCorrectAnswer ?? false,
            correctAnswers: data.correctAnswers ?? [],
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
            delayBetweenLetterDisplay: data.delayBetweenLetterDisplay ?? false,
            sameLettersPolicy: this.normalizeSameLettersPolicy(data.sameLettersPolicy),
        };
    }

    /**
    * Parse the optional automatic letter-reveal delay.
     *
     * The markdown value may be omitted, set to the literal string `false`, or
    * provided as a non-negative number of seconds.
     *
     * @param section Parsed markdown section content.
    * @returns A numeric delay in seconds, or `false` when auto-reveal is disabled.
     * @throws {Error} If the value is a list, not numeric, or negative.
     */
    private parseDelayBetweenLetterDisplay(section: ParsedSectionContent): number | false {
        const rawValue = section["delay_between_letter_display"];
        if (rawValue === undefined) {
            return false;
        }
        if (Array.isArray(rawValue)) {
            throw new Error("Guess word key \"delay_between_letter_display\" must be a number or \"false\", not a list");
        }

        const normalized = rawValue.trim().toLowerCase();
        if (normalized === "false") {
            return false;
        }

        const parsedDelaySeconds = Number(rawValue);
        if (!Number.isFinite(parsedDelaySeconds)) {
            throw new Error(`Guess word key \"delay_between_letter_display\" must be a valid number or \"false\", received \"${rawValue}\"`);
        }
        if (parsedDelaySeconds < 0) {
            throw new Error(`Guess word key \"delay_between_letter_display\" must be >= 0, received ${parsedDelaySeconds}`);
        }

        return parsedDelaySeconds;
    }

    /**
     * Parse the repeated-letter reveal policy from markdown.
     *
     * When omitted, the default runtime policy is used.
     *
     * @param section Parsed markdown section content.
     * @returns One of the supported repeated-letter policies.
     * @throws {Error} If the value is provided as a list or is unsupported.
     */
    private parseSameLettersPolicy(section: ParsedSectionContent): GuessWordGameDefinitionData["sameLettersPolicy"] {
        const rawValue = section["same_letters_policy"];
        if (rawValue === undefined) {
            return "default";
        }
        if (Array.isArray(rawValue)) {
            throw new Error("Guess word key \"same_letters_policy\" must be a string value, not a list");
        }

        return this.normalizeSameLettersPolicy(rawValue.trim().toLowerCase());
    }

    /**
     * Validate and normalize the repeated-letter reveal policy.
     *
     * @param value Candidate policy value from markdown or persisted JSON.
     * @returns A validated policy string accepted by the Guess Word runtime.
     * @throws {Error} If the provided value is not one of the supported options.
     */
    private normalizeSameLettersPolicy(value: unknown): GuessWordGameDefinitionData["sameLettersPolicy"] {
        if (value === "separate" || value === "together" || value === "default") {
            return value;
        }

        throw new Error(`Guess word key \"same_letters_policy\" must be one of \"separate\", \"together\", \"default\", received \"${String(value)}\"`);
    }
}
