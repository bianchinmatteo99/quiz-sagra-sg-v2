import { GameDefinition, GameDefinitionBuilder } from "../game.base";

export class ReazioneCatenaGameDefinition extends GameDefinition {
    readonly name = "catena";
    readonly displayName = "Reazione a catena";
    timeForAnswer: number;
    canRetryForSameWord: boolean;
    words: string[];
    pointsForCorrectAnswer: number;

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

export class ReazioneCatenaGameDefinitionBuilder implements GameDefinitionBuilder<ReazioneCatenaGameDefinition> {
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

    parseFromJSON(id: number, data: any): ReazioneCatenaGameDefinition {
        return new ReazioneCatenaGameDefinition(id, data);
    }
}
