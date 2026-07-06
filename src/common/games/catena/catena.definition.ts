import { GameDefinition, GameDefinitionBuilder } from "../game.base";

/**
 * Immutable definition for the Catena game.
 *
 * Captures game-specific rules such as word list, answer timing, retry policy,
 * and point values.
 */
export class ReazioneCatenaGameDefinition extends GameDefinition {
    readonly name = "catena";
    readonly displayName = "Reazione a catena";
    /** Time allowed for each answer before the round advances. */
    timeForAnswer: number;
    /** When true, players may retry guesses for the same word after an incorrect attempt. */
    canRetryForSameWord: boolean;
    /** Ordered list of words used by the chain. */
    words: string[];
    /** Points awarded for each correct word guess. */
    pointsForCorrectAnswer: number;

    /**
     * Create a Catena definition from raw JSON-compatible data.
     *
     * Supports both snake_case and camelCase input properties.
     */
    constructor(id:number, data: any = {}) {
        super(id);
        this.timeForAnswer = Number(data.time_for_answer ?? data.timeForAnswer ?? 0);
        this.canRetryForSameWord =
            data.can_retry_for_same_word === true ||
            data.canRetryForSameWord === true ||
            String(data.can_retry_for_same_word).toLowerCase() === "true";
        this.words = Array.isArray(data.words) ? data.words.map(String) : [];
        this.pointsForCorrectAnswer = Number(data.points_for_correct_answer ?? 10);
    }
 
    /**
     * Serialize the Catena definition for storage or transmission.
     */
    toJSON(): any {
        return {
            name: this.name,
            time_for_answer: this.timeForAnswer,
            can_retry_for_same_word: this.canRetryForSameWord,
            words: this.words,
            points_for_correct_answer: this.pointsForCorrectAnswer,
        };
    }
}

/**
 * Builder for Catena game definitions.
 *
 * Parses game sections from markdown and restores persisted definition JSON.
 */
export class ReazioneCatenaGameDefinitionBuilder implements GameDefinitionBuilder<ReazioneCatenaGameDefinition> {
    /**
     * Parse a Catena game definition from markdown content.
     *
     * Expects a title line `## catena` followed by configuration keys and a word list.
     */
    parseFromMD(id: number, md: string): ReazioneCatenaGameDefinition {
        const lines = md.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        const titleLine = lines[0] || "";
        const gameTitle = titleLine.startsWith("## ") ? titleLine.substring(3).trim().toLowerCase() : "";
        if (gameTitle !== "catena") throw new Error(`Unexpected game type in section: ${gameTitle}`);

        const sectionData: any = {};
        const words: string[] = [];
        let parsingWords = false;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("time_for_answer:")) {
                sectionData.time_for_answer = Number(line.split(":")[1].trim());
                parsingWords = false;
            } else if (line.startsWith("can_retry_for_same_word:")) {
                sectionData.can_retry_for_same_word = line.split(":")[1].trim().toLowerCase() === "true";
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
        return new ReazioneCatenaGameDefinition(id, sectionData);
    }

    /**
     * Restore a Catena definition from stored JSON data.
     */
    parseFromJSON(id: number, data: any): ReazioneCatenaGameDefinition {
        return new ReazioneCatenaGameDefinition(id, data);
    }
}
