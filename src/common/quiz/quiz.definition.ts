import { IDatabaseAdapter } from "../database/database.types";
import { GameDefinition } from "../games/game.base";
import { GameDefinitionData } from "../games/games.contracts";
import { gamesDefBuilders } from "../games/games.register";

/**
 * Represents the quiz definition and the list of games included in the quiz.
 */
export class QuizDefinition {
    static readonly DBPATH = "/definition";
    title: string;
    games: GameDefinition<GameDefinitionData>[];

    constructor(title: string, games: GameDefinition<GameDefinitionData>[]) {
        this.title = title;
        this.games = games;
    }

    /**
     * Persist the quiz definition to the configured database path.
     * @param db Database adapter used for persistence.
     */
    async saveToDatabase(db: IDatabaseAdapter): Promise<void> {
        try {
            await db.set(QuizDefinition.DBPATH, this.toJSON());
        } catch (error) {
            console.error('Error saving quiz to database:', error);
        }
    }

    /**
     * Serialize the quiz definition into a JSON-compatible object.
     * @returns Serialized quiz definition.
     */
    toJSON(): any {
        return {
            title: this.title,
            games: this.games.map(game => game.data),
        };
    }

    /**
     * Create an empty placeholder definition when no quiz is loaded.
     * @returns Placeholder quiz definition.
     */
    static placeholder(): QuizDefinition {
        return new QuizDefinition("Empty Quiz", []);
    }
}

/**
 * Parses quiz definitions from Markdown or persisted JSON data.
 */
export class QuizDefinitionBuilder {
    /**
     * Load a quiz definition from a markdown file.
     * @param filename Path to the quiz definition markdown file.
     */
    async loadFromFile(filename: string): Promise<QuizDefinition | null> {
        try {
            const response = await fetch(filename);
            const text = await response.text();
            return this.parseFromMD(text);
        } catch (error) {
            console.error('Error loading quiz from file:', error);
            return null;
        }
    }

    /**
     * Load a quiz definition from the database.
     * @param db Database adapter used for retrieval.
     */
    async loadFromDatabase(db: IDatabaseAdapter): Promise<QuizDefinition | null> {
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

    /**
     * Parse a quiz definition from markdown text.
     * @param md The raw markdown content.
     */
    async parseFromMD(md: string): Promise<QuizDefinition | null> {
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

            const games = gameSections.entries().toArray().map(([id, section]) => {
                const sectionLines = section.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
                const header = sectionLines[0] || "";
                const gameTitle = header.startsWith("## ") ? header.substring(3).trim().toLowerCase() : "";
                if (!(gameTitle in gamesDefBuilders)) throw new Error(`Unknown game type: ${gameTitle}`);
                const gameData = gamesDefBuilders[gameTitle].parseFromMD(section);
                return new GameDefinition(id, gameTitle, gameData);
            });

            return new QuizDefinition(title, games);
        } catch (error) {
            console.error('Error parsing quiz from Markdown:', error);
            return null;
        }
    }

    /**
     * Parse a quiz definition from JSON data loaded from storage.
     * @param data JSON payload containing serialized quiz definition.
     */
    async parseFromJSON(data: any): Promise<QuizDefinition | null> {
        try {
            const title = data.title;
            const games = (data.games || []).entries().toArray().map(([id, gameData]: [number, any]) => {
                const gameKind = gameData?.kind;
                if (!gameKind || typeof gameKind !== "string") throw new Error("Game data missing 'kind' property");
                if (!(gameKind in gamesDefBuilders)) throw new Error(`Unknown game type: ${gameKind}`);
                const parsedData = gamesDefBuilders[gameKind].parseFromJSON(gameData);
                return new GameDefinition(id, gameKind, parsedData);
            });
            return new QuizDefinition(title, games);
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return null;
        }
    }
}