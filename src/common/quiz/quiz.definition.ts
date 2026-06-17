import { IDatabaseAdapter } from "../database/database.types";
import { GameDefinition } from "../games/game.base";
import { gamesDefBuilders } from "../games/games.register";


export class QuizDefinition {
    static readonly DBPATH = "/definition";
    title: string;
    games: GameDefinition[];

    constructor(title: string, games: GameDefinition[]) {
        this.title = title;
        this.games = games;
    }

    async saveToDatabase(db: IDatabaseAdapter): Promise<void> {
        // Save the current quiz state to the database
        try {
            await db.set(QuizDefinition.DBPATH, this.toJSON());
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


export class QuizDefinitionBuilder {
    async loadFromFile(filename: string): Promise<QuizDefinition | null> {
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

    async loadFromDatabase(db: IDatabaseAdapter): Promise<QuizDefinition | null> {
        // Load quiz definition from the database and initialize state
        try {
            const data = await db.get<any>(QuizDefinition.DBPATH);
            if (data) {
                return this.parseFromJSON(data);
            }
        } catch (error) {
            console.error('Error loading quiz from database:', error);
        }
        return null;
    }

    async parseFromMD(md: string): Promise<QuizDefinition | null> {
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
                if (!(gameTitle in gamesDefBuilders)) throw new Error(`Unknown game type: ${gameTitle}`);
                return gamesDefBuilders[gameTitle].parseFromMD(section);
            });

            return new QuizDefinition(title, games);
        } catch (error) {
            console.error('Error parsing quiz from Markdown:', error);
            return null;
        }
    }

    async parseFromJSON(data: any): Promise<QuizDefinition | null> {
        // Parse quiz definition from JSON data
        try {
            const title = data.title;
            const games = (data.games || []).map((gameData: any) => {
                if (!gameData.name) throw new Error("Game data missing 'name' property");
                if (!(gameData.name in gamesDefBuilders)) throw new Error(`Unknown game type: ${gameData.name}`);
                return gamesDefBuilders[gameData.name as string].parseFromJSON(gameData);
            });
            return new QuizDefinition(title, games);
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return null;
        }
    }
}