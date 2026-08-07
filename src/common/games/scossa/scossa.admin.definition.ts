import { MDUtils } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { ScossaGameDefinitionData, ScossaGameRequiredData } from "./scossa.contracts";

export type ScossaGameDefinition = GameDefinition<ScossaGameDefinitionData>;

export class ScossaGameDefinitionBuilder implements GameDefinitionBuilder<ScossaGameDefinitionData> {
    parseFromMD(md: string): ScossaGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "points_for_correct_answer",
            "points_lost_for_wrong_answer",
            "values",
        ], "Scossa markdown");

        const title = MDUtils.parseString(parsed, "title", ScossaGameRequiredData.name);
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const pointsLostForWrongAnswer = MDUtils.parseNumber(parsed, "points_lost_for_wrong_answer");
        const rawValues = MDUtils.parseStringList(parsed, "values");

        if (pointsForCorrectAnswer < 0) {
            throw new Error(`Scossa key \"points_for_correct_answer\" must be >= 0, received ${pointsForCorrectAnswer}`);
        }
        if (pointsLostForWrongAnswer < 0) {
            throw new Error(`Scossa key \"points_lost_for_wrong_answer\" must be >= 0, received ${pointsLostForWrongAnswer}`);
        }

        const words: string[] = [];
        const wrongWords: string[] = [];

        rawValues.forEach((entry, index) => {
            const isWrong = entry.startsWith("*");
            const value = (isWrong ? entry.slice(1) : entry).trim();
            if (value.length === 0) {
                throw new Error(`Scossa key \"values\" item ${index + 1} cannot be empty`);
            }

            words.push(value);
            if (isWrong) {
                wrongWords.push(value);
            }
        });

        if (words.length < 2) {
            throw new Error(`Scossa key \"values\" must contain at least 2 items, received ${words.length}`);
        }
        if (wrongWords.length < 1) {
            throw new Error("Scossa key \"values\" must include at least one item prefixed with '*'");
        }

        return {
            ...ScossaGameRequiredData,
            title,
            pointsForCorrectAnswer,
            pointsLostForWrongAnswer,
            words,
            wrongWords,
        };
    }

    parseFromJSON(data: Partial<ScossaGameDefinitionData>): ScossaGameDefinitionData {
        const words = data.words ?? [];
        const wrongWords = data.wrongWords ?? [];

        return {
            ...ScossaGameRequiredData,
            title: data.title ?? ScossaGameRequiredData.name,
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
            pointsLostForWrongAnswer: data.pointsLostForWrongAnswer ?? 5,
            words,
            wrongWords,
        };
    }
}
