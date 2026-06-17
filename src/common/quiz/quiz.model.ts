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

export class QuizDefinition{
    title: string;
    games: Game[];

    constructor(title: string, games: Game[]){
        this.title = title;
        this.games = games;
    }

    static async loadFromFile(filename: string): Promise<QuizDefinition | null> {
        // Load quiz definition from a JSON file and initialize state
        try {
            const response = await fetch(filename);
            const text = await response.text();
            return this.parseFromMD(text);
        } catch (error) {
            console.error('Error loading quiz from file:', error);
            return null;
        }
    }

    static async loadFromDatabase(db: IDatabaseAdapter): Promise<QuizDefinition | null> {
        // Load quiz definition from the database and initialize state
        try {
            const data = await db.get<any>("/definition");
            if (data) {
                return QuizDefinition.parseFromJSON(data);
            }
        } catch (error) {
            console.error('Error loading quiz from database:', error);
        }
        return null;
    }

    static parseFromMD(md: string): QuizDefinition | null {
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

            return new QuizDefinition(title, games);
        } catch (error) {
            console.error('Error parsing quiz from Markdown:', error);
            return null;
        }
    }

    static parseFromJSON(data: any): QuizDefinition | null {
        // Parse quiz definition from JSON data
        try {
            const title = data.title;
            const games = (data.games || []).map((gameData: any) => {
                if (!gameData.name) throw new Error("Game data missing 'name' property");
                if (!(gameData.name in existingGames)) throw new Error(`Unknown game type: ${gameData.name}`);
                return existingGames[gameData.name as string].parseFromJSON(gameData);
            });
            return new QuizDefinition(title, games);
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return null;
        }
    }

    async saveToDatabase(db: IDatabaseAdapter): Promise<void> {
        // Save the current quiz state to the database
        try {
            await db.set("/definition", this.toJSON());
        } catch (error) {
            console.error('Error saving quiz to database:', error);
        }
    }

    toJSON(): any {
        // Convert quiz state to JSON for saving to the database
        return {
            title: this.title,
            games: this.games.map(game => game.toJSON()),
        };
    }

    static placeholder(): QuizDefinition {
        return new QuizDefinition("Empty Quiz", []);
    }
}

enum GameStatus {
    NotStarted,
    Disabled,
    InProgress,
    Completed,
}
    
class QuizModel {
    definition: QuizDefinition;
    status: QuizStatus;
    currentGame: number | null;
    gamesStatuses: GameStatus[];

    context: QuizModelContext;

    constructor(ctx: QuizModelContext, def: QuizDefinition, restoreState: boolean = false) {
        this.definition = def;
        this.gamesStatuses = [...Array(def.games.length).fill(GameStatus.NotStarted)];
        this.status = QuizStatus.Booting;
        this.currentGame = null;
        this.context = ctx;
        if (restoreState) {
            // Load state from database if needed
            this.loadFromDatabase();
        }
    }

    async loadFromDatabase(): Promise<boolean> {
        // Load quiz definition from the database and initialize state
        try {
            const data = await this.context.getDatabase().get<any>("/state/quiz");
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
            await this.context.getDatabase().set("/state/quiz", this.toJSON());
        } catch (error) {
            console.error('Error saving quiz to database:', error);
        }
    }

    parseFromJSON(data: any): boolean {
        // Parse quiz definition from JSON data
        try {
            this.gamesStatuses = data.gamesStatuses ?? [...Array(this.definition.games.length).fill(GameStatus.NotStarted)];
            this.status = data.status ?? QuizStatus.Booting;
            this.currentGame = data.currentGame ?? null;
            return true;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return false;
        }
    }

    toJSON(): any {
        // Convert quiz state to JSON for saving to the database
        return {
            gamesStatuses: this.gamesStatuses,
            status: this.status,
            currentGame: this.currentGame,
        };
    }
}

export { QuizModel, QuizStatus, GameStatus };
export type { QuizModelContext };
