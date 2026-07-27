import { GameDefinition, GameDefinitionBuilder } from "../game.base";
import { CatenaGameDefinitionData } from "./catena.contracts";

export type CatenaGameDefinition = GameDefinition<CatenaGameDefinitionData>;

/**
 * Builder for Catena game definitions.
 *
 * Parses game sections from markdown and restores persisted definition JSON.
 */
export class CatenaGameDefinitionBuilder implements GameDefinitionBuilder<CatenaGameDefinitionData> {
    /**
     * Parse a Catena game definition from markdown content.
     *
     * Expects a title line `## catena` followed by configuration keys and a word list.
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
     * Restore a Catena definition from stored JSON data.
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
