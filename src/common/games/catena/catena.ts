import { Game } from "../game.base";

export class ReazioneCatenaGame extends Game {
    name = "catena";
    timeForAnswer: number;
    canRetryForSameWord: boolean;
    words: string[];

    constructor(data: any = {}) {
        super();
        this.timeForAnswer = Number(data.time_for_answer ?? data.timeForAnswer ?? 0);
        this.canRetryForSameWord =
            data.can_retry_for_same_word === true ||
            data.canRetryForSameWord === true ||
            String(data.can_retry_for_same_word).toLowerCase() === "true";
        this.words = Array.isArray(data.words) ? data.words.map(String) : [];
    }

    static parseFromMD(md: string): ReazioneCatenaGame {
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
        return new ReazioneCatenaGame(sectionData);
    }

    static parseFromJSON(data: any): ReazioneCatenaGame {
        return new ReazioneCatenaGame(data);
    }

    toJSON(): any {
        return {
            name: ReazioneCatenaGame.name,
            time_for_answer: this.timeForAnswer,
            can_retry_for_same_word: this.canRetryForSameWord,
            words: this.words,
        };
    }
}
