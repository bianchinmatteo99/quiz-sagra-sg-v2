import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { CatenaGameDefinitionData } from "./catena.contracts";

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
     * - first non-empty line is a level-2 heading (`## Catena`, case-insensitive),
     * - optional scalar keys (`title`, `time_for_answer`,
     *   `can_retry_for_same_word`, `points_for_correct_answer`),
     * - `words:` followed by list items (`- value`).
     *
     * Blank lines are ignored. Unknown lines stop list parsing until a new
     * recognized key appears.
     *
     * @param md Markdown text for a single Catena section.
     * @returns Normalized Catena definition payload with enforced `kind`/`name`
     * and default values when optional keys are missing.
     * @throws Error When the section heading is not `catena`.
     */
    parseFromMD(md: string): CatenaGameDefinitionData {
        const lines = md.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        const titleLine = lines[0] || "";
        const gameTitle = titleLine.startsWith("## ") ? titleLine.substring(3).trim().toLowerCase() : "";
        if (gameTitle !== "catena") throw new Error(`Unexpected game type in section: ${gameTitle}`);

        const sectionData: Omit<CatenaGameDefinitionData, "kind" | "name"> = {
            timeForAnswer: 0,
            canRetryForSameWord: false,
            words: [],
            pointsForCorrectAnswer: 10,
        };
        const words: string[] = [];
        let parsingWords = false;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("time_for_answer:")) {
                sectionData.timeForAnswer = Number(line.split(":")[1].trim());
                parsingWords = false;
            } else if (line.startsWith("title:")) {
                sectionData.title = line.split(":").slice(1).join(":").trim();
                parsingWords = false;
            } else if (line.startsWith("can_retry_for_same_word:")) {
                sectionData.canRetryForSameWord = line.split(":")[1].trim().toLowerCase() === "true";
                parsingWords = false;
            } else if (line.startsWith("points_for_correct_answer:")) {
                sectionData.pointsForCorrectAnswer = Number(line.split(":")[1].trim());
                parsingWords = false;
            } else if (line.startsWith("words:")) {
                parsingWords = true;
            } else if (parsingWords && line.startsWith("-")) {
                words.push(line.substring(1).trim());
            } else {
                parsingWords = false;
            }
        }

        sectionData.words = words;
        return {
            kind: "catena",
            name: "Reazione a catena",
            ...(sectionData.title ? { title: sectionData.title } : {}),
            timeForAnswer: sectionData.timeForAnswer,
            canRetryForSameWord: sectionData.canRetryForSameWord,
            words: sectionData.words,
            pointsForCorrectAnswer: sectionData.pointsForCorrectAnswer,
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
    parseFromJSON(data: any): CatenaGameDefinitionData {
        return {
            kind: "catena",
            name: "Reazione a catena",
            timeForAnswer: Number(data?.timeForAnswer ?? 0),
            canRetryForSameWord: data?.canRetryForSameWord === true,
            words: Array.isArray(data?.words) ? data.words.map((w: unknown) => String(w)) : [],
            pointsForCorrectAnswer: Number(data?.pointsForCorrectAnswer ?? 10),
            ...(typeof data?.title === "string" && data.title.length > 0 ? { title: data.title } : {}),
        };
    }
}
