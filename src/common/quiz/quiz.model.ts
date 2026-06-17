import { Game } from "../games/game.base";
import { IDatabaseAdapter } from "../database/database.types";
import { existingGames } from "../games/games.definition";

enum QuizStatus {
    Booting, // Loading quiz definition and setting up the database
    AwaitingStart, // Waiting for the host to start the quiz
    OnBoarding, // Players are joining and setting up their profiles
    RunningGame, // A game is currently running
    Idle, // No game is running, but the quiz is active (e.g. between games)
    Ended, // The quiz has ended
}

interface QuizModelContext {
    getDatabase(): IDatabaseAdapter;
}
    
class QuizModel {
    title: string;
    games: Game[];
    pastGamesOrder: number[];
    futureGamesOrder: number[];
    status: QuizStatus;
    currentGame: number | null;

    context: QuizModelContext;

    constructor(ctx: QuizModelContext) {
        this.title = "Empty";
        this.games = [];
        this.pastGamesOrder = [];
        this.futureGamesOrder = [];
        this.status = QuizStatus.Booting;
        this.currentGame = null;
        this.context = ctx;
    }

    initialize(title: string, games: Game[]): void {
        this.title = title;
        this.games = games;
        this.pastGamesOrder = [];
        this.futureGamesOrder = [...Array(games.length).keys()]; // Default order is sequential
        this.status = QuizStatus.Booting;
        this.currentGame = null;
    }

    async loadFromFile(filename: string): Promise<boolean> {
        // Load quiz definition from a JSON file and initialize state
        try {
            const response = await fetch(filename);
            const text = await response.text();
            return this.parseFromMD(text);
        } catch (error) {
            console.error('Error loading quiz from file:', error);
            return false;
        }
    }

    async loadFromDatabase(): Promise<boolean> {
        // Load quiz definition from the database and initialize state
        try {
            const snapshot = await this.context.getDatabase().get<any>("/quiz");
            const data = snapshot.val();
            if (data) {
                return this.parseFromJSON(data);
            }
        } catch (error) {
            console.error('Error loading quiz from database:', error);
        }
        return false;
    }

    async saveToDatabase(): Promise<void> {
        // Save the current quiz state to the database
        try {
            await this.context.getDatabase().set("/quiz", this.toJSON());
        } catch (error) {
            console.error('Error saving quiz to database:', error);
        }
    }

    parseFromMD(md: string): boolean {
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

            this.initialize(title, games);
            return true;
        } catch (error) {
            console.error('Error parsing quiz from Markdown:', error);
            return false;
        }
    }

    parseFromJSON(data: any): boolean {
        // Parse quiz definition from JSON data
        try {
            const title = data.title;
            const games = (data.games || []).map((gameData: any) => {
                if (!gameData.name) throw new Error("Game data missing 'name' property");
                if (!(gameData.name in existingGames)) throw new Error(`Unknown game type: ${gameData.name}`);
                return existingGames[gameData.name as string].parseFromJSON(gameData);
            });
            this.initialize(title, games);
            this.pastGamesOrder = data.pastGamesOrder ?? [];
            this.futureGamesOrder = data.futureGamesOrder ?? [...Array(games.length).keys()];
            this.status = data.status || QuizStatus.Booting;
            this.currentGame = data.currentGame || null;
            return true;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return false;
        }
    }

    toJSON(): any {
        // Convert quiz state to JSON for saving to the database
        return {
            title: this.title,
            games: this.games.map(game => game.toJSON()),
            pastGamesOrder: this.pastGamesOrder,
            futureGamesOrder: this.futureGamesOrder,
            status: this.status,
            currentGame: this.currentGame,
        };
    }
}

export { QuizModel, QuizStatus };
export type { QuizModelContext };
