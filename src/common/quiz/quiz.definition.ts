import { IDatabaseAdapter } from "../database/database.types";
import { AnyGameDefinition, GameDefinition } from "../games/games.admin.base"; // TESTING V2 - LINE WAS import { AnyGameDefinition, GameDefinition } from "../games/games.admin.base";
import { GameDefinition as GameDefinitionv2 } from "../games/tests.v2.base"; // TESTING V2 - LINE WAS import { AnyGameDefinition, GameDefinition } from "../games/games.admin.base";
import { gamesDefBuilders } from "../games/games.admin.register";
import { MDUtils } from "../md.utils";
import { QuizDefinitionSnapshot } from "./quiz.contract";

function removeUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => item === undefined ? null : removeUndefinedDeep(item)) as T;
    }

    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, entryValue]) => entryValue !== undefined)
                .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)])
        ) as T;
    }

    return value;
}

function buildQuizGameDefinition(id: number, gameTitle: string, gameData: AnyGameDefinition["data"]): AnyGameDefinition {
    if (gameTitle === "guess_song") {
        return Object.assign(Object.create(GameDefinitionv2.prototype), { id, ...gameData, data: gameData }) as AnyGameDefinition;
    }

    return new GameDefinition(id, gameTitle, gameData) as AnyGameDefinition;
}

/**
 * Represents the quiz definition and the list of games included in the quiz.
 */
export class QuizDefinition {
    static readonly DBPATH = "/definition";
    title: string;
    startTime: string;
    games: AnyGameDefinition[];

    constructor(title: string, games: AnyGameDefinition[], startTime: string, ) {
        this.title = title;
        this.games = games;
        this.startTime = startTime;
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
    toJSON(): QuizDefinitionSnapshot {
        return removeUndefinedDeep({
            title: this.title,
            games: this.games.map(game => game.data),
            startTime: this.startTime,
        }) as QuizDefinitionSnapshot;
    }

    /**
     * Create an empty placeholder definition when no quiz is loaded.
     * @returns Placeholder quiz definition.
     */
    static placeholder(): QuizDefinition {
        return new QuizDefinition("Empty Quiz", [], "");
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
            const data = await db.get<QuizDefinitionSnapshot>(QuizDefinition.DBPATH);
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
            const quizStructure = MDUtils.parseQuizStructure(md);

            const games = quizStructure.sections.entries().toArray().map(([id, section]) => {
                const gameTitle = section.title.toLowerCase();
                if (!(gameTitle in gamesDefBuilders)) throw new Error(`Unknown game type: ${gameTitle}`);
                const gameData = gamesDefBuilders[gameTitle]!.parseFromMD(section.content);
                return buildQuizGameDefinition(id, gameTitle, gameData); // TESTING V2 - LINE WAS                 return new GameDefinition(id, gameTitle, gameData);
            });

            return new QuizDefinition(quizStructure.title, games, MDUtils.parseString(quizStructure.options, "start_time", ""));
        } catch (error) {
            console.error('Error parsing quiz from Markdown:', error);
            return null;
        }
    }

    /**
     * Parse a quiz definition from JSON data loaded from storage.
     * @param data JSON payload containing serialized quiz definition.
     */
    async parseFromJSON(data: Partial<QuizDefinitionSnapshot>): Promise<QuizDefinition | null> {
        try {
            const title = data.title ?? "";
            const games = (data.games ?? []).entries().toArray().map(([id, gameData]) => {
                const gameKind = gameData.kind;
                if(!(gameKind in gamesDefBuilders)) throw new Error(`Unknown game type: ${gameKind}`);
                const parsedData = gamesDefBuilders[gameKind]!.parseFromJSON(gameData);
                return buildQuizGameDefinition(id, gameKind, parsedData); // TESTING V2 - LINE WAS                 return new GameDefinition(id, gameKind, parsedData);
            });
            return new QuizDefinition(title, games, data.startTime ?? "");
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return null;
        }
    }
}