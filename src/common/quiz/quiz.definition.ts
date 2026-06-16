import { database } from "../../firebase-init";
import { ref, get, onValue, set, update, remove, off } from "firebase/database";

enum QuizStatus {
    Booting, // Loading quiz definition and setting up the database
    AwaitingStart, // Waiting for the host to start the quiz
    OnBoarding, // Players are joining and setting up their profiles
    RunningGame, // A game is currently running
    Idle, // No game is running, but the quiz is active (e.g. between games)
    Ended, // The quiz has ended
}

interface GameConstructor {
    new(data: any): Game;
    parseFromMD(md: string): Game;
    parseFromJSON(data: any): Game;
}

abstract class Game {
    abstract toJSON(): any;
}

class ReazioneCatenaGame extends Game {
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
            name: "catena",
            time_for_answer: this.timeForAnswer,
            can_retry_for_same_word: this.canRetryForSameWord,
            words: this.words,
        };
    }
}

const existingGames: { [key: string]: GameConstructor } = {
    "catena": ReazioneCatenaGame,
};

class QuizState {
    title: string;
    games: Game[];
    gameOrder: number[];
    status: QuizStatus;
    currentGame: number | null;

    constructor(title: string, games: Game[]) {
        this.title = title;
        this.games = games;
        this.gameOrder = [];
        this.status = QuizStatus.Booting;
        this.currentGame = null;
    }

    static async loadFromFile(): Promise<QuizState | null> {
        // Load quiz definition from a JSON file and initialize state
        const response = await fetch("/quiz_def.md");
        try {
            const text = await response.text();
            return QuizState.parseFromMD(text);
        } catch (error) {
            console.error('Error loading quiz from file:', error);
            return null;
        }
    }

    static async loadFromDatabase(): Promise<QuizState | null> {
        // Load quiz definition from the database and initialize state
        try {
            const snapshot = await get(ref(database, "/quiz"));
            const data = snapshot.val();
            if (data) {
                return QuizState.parseFromJSON(data);
            }
        } catch (error) {
            console.error('Error loading quiz from database:', error);
        }
        return null;
    }

    async saveToDatabase(): Promise<void> {
        // Save the current quiz state to the database
        try {
            await set(ref(database, "/quiz"), this.toJSON());
        } catch (error) {
            console.error('Error saving quiz to database:', error);
        }
    }

    static parseFromMD(md: string): QuizState | null {
        // Parse quiz definition from Markdown text
        try {
            const lines = md.split(/\r?\n/);
            const titleLineIndex = lines.findIndex(line => line.trim().startsWith("# "));
            if (titleLineIndex < 0) throw new Error("Quiz definition missing title");
            const title = lines[titleLineIndex].trim().substring(2).trim();

            const gameSections: string[] = [];
            let currentSection: string[] = [];

            for (let i = titleLineIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim().startsWith("## ")) {
                    if (currentSection.length > 0) {
                        gameSections.push(currentSection.join("\n"));
                    }
                    currentSection = [line];
                } else if (currentSection.length > 0) {
                    currentSection.push(line);
                }
            }

            if (currentSection.length > 0) {
                gameSections.push(currentSection.join("\n"));
            }

            if (gameSections.length === 0) throw new Error("Quiz definition contains no game sections");

            const games = gameSections.map(section => {
                const sectionLines = section.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
                const header = sectionLines[0] || "";
                const gameTitle = header.startsWith("## ") ? header.substring(3).trim().toLowerCase() : "";
                if (!(gameTitle in existingGames)) throw new Error(`Unknown game type: ${gameTitle}`);
                return existingGames[gameTitle].parseFromMD(section);
            });

            return new QuizState(title, games);
        } catch (error) {
            console.error('Error parsing quiz from Markdown:', error);
            return null;
        }
    }

    static parseFromJSON(data: any): QuizState | null {
        // Parse quiz definition from JSON data
        try {
            const title = data.title;
            const games = (data.games || []).map((gameData: any) => {
                if (!gameData.name) throw new Error("Game data missing 'name' property");
                if (!(gameData.name in existingGames)) throw new Error(`Unknown game type: ${gameData.name}`);
                return existingGames[gameData.name as string].parseFromJSON(gameData);
            });
            const quizState = new QuizState(title, games);
            quizState.gameOrder = data.gameOrder || [];
            quizState.status = data.status || QuizStatus.Booting;
            quizState.currentGame = data.currentGame || null;
            return quizState;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return null;
        }
    }

    toJSON(): any {
        // Convert quiz state to JSON for saving to the database
        return {
            title: this.title,
            games: this.games.map(game => game.toJSON()),
            gameOrder: this.gameOrder,
            status: this.status,
            currentGame: this.currentGame,
        };
    }
}

class Quiz{
    state: QuizState;

    constructor(state: QuizState) {
        this.state = state;
    }


}

export { QuizStatus, Game, ReazioneCatenaGame, QuizState, Quiz };