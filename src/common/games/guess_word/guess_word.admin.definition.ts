import { MDUtils, ParsedSectionContent } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { GuessWordGameDefinitionData, GuessWordGameRequiredData } from "./guess_word.contract";

/** Convenience alias for a fully-typed Guess Word game definition instance. */
export type GuessWordGameDefinition = GameDefinition<GuessWordGameDefinitionData>;

/**
 * Parser and normalizer for `guess_word` game definitions.
 */
export class GuessWordGameDefinitionBuilder implements GameDefinitionBuilder<GuessWordGameDefinitionData> {
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

        const parsedDelay = Number(rawValue);
        if (!Number.isFinite(parsedDelay)) {
            throw new Error(`Guess word key \"delay_between_letter_display\" must be a valid number or \"false\", received \"${rawValue}\"`);
        }
        if (parsedDelay < 0) {
            throw new Error(`Guess word key \"delay_between_letter_display\" must be >= 0, received ${parsedDelay}`);
        }

        return parsedDelay;
    }

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

    private normalizeSameLettersPolicy(value: unknown): GuessWordGameDefinitionData["sameLettersPolicy"] {
        if (value === "separate" || value === "together" || value === "default") {
            return value;
        }

        throw new Error(`Guess word key \"same_letters_policy\" must be one of \"separate\", \"together\", \"default\", received \"${String(value)}\"`);
    }
}
