import { BaseModel, BaseModelContext } from "../../admin.utils";
import { AnyFieldsObject, CompleteGameDefinition, GameDbDataFromFields, GameModelDataFromFields, GameNoncustomDbDataFromFields } from "./base.admin.contracts";

/** Runtime services required by game models for database persistence and update notifications. */
export interface GameModelContext extends BaseModelContext {}

/**
 * Base persisted runtime model for field-based games.
 *
 * This class handles default initialization and bidirectional mapping between
 * in-memory field values and the public database payload.
 */
export abstract class GameModel<T extends AnyFieldsObject> extends BaseModel<GameDbDataFromFields<T>> {
    /** Realtime Database location used for active game state snapshots. */
    readonly DBPATH = "/state/game";

    /** Schema describing required/definition/model field behavior. */
    readonly fields: T;
    /** Immutable parsed definition payload for the active game instance. */
    readonly definition: CompleteGameDefinition<T>;
    /** Host context used by BaseModel persistence APIs. */
    context: GameModelContext;

    constructor(ctx: GameModelContext, definition: CompleteGameDefinition<T>, fields: T) {
        super();
        this.context = ctx;
        this.definition = definition;
        this.fields = fields;
        Object.assign(this, definition);

        const target = this as Record<string, unknown>;
        for (const [fieldKey, field] of Object.entries(fields)) {
            if (field.flavour !== "model") continue;
            target[fieldKey] = typeof field.default === "function" ? (field.default as () => unknown)() : field.default;
        }
    }

    /**
     * Decode persisted DB data into model properties handled by the field schema.
     *
     * Definition fields prefer stored public values when present, otherwise
     * fallback to immutable definition defaults.
     */
    protected parseFieldsFromDbData(data: Partial<GameDbDataFromFields<T>>): GameNoncustomDbDataFromFields<T> {
        const definitionData = this.definition as unknown as Record<string, unknown>;
        const dbData = data as Record<string, unknown>;
        const parsed: Record<string, unknown> = {};

        for (const [fieldKey, field] of Object.entries(this.fields)) {
            switch (field.flavour) {
                case "title":
                    parsed[fieldKey] = dbData[fieldKey] !== undefined ? dbData[fieldKey] : definitionData[fieldKey];
                    break;
                case "definition":
                    if (field.visibility === "public") {
                        parsed[fieldKey] = dbData[fieldKey] !== undefined ? dbData[fieldKey] : definitionData[fieldKey];
                    }
                    break;
                case "model":
                    if (field.visibility === "public") {
                        const fromDb = dbData[fieldKey];
                        if (fromDb === undefined) {
                            parsed[fieldKey] = typeof field.default === "function" ? (field.default as () => unknown)() : field.default;
                        } else if (!field.codec) {
                            parsed[fieldKey] = fromDb;
                        } else {
                            const decoded = field.codec.decode(fromDb);
                            parsed[fieldKey] = decoded !== null ? decoded : (typeof field.default === "function" ? (field.default as () => unknown)() : field.default);
                        }
                    }
                    break;
            }
        }

        return parsed as GameNoncustomDbDataFromFields<T>;
    }

    /**
     * Encode current model properties into a persistable DB payload.
     *
     * Only fields declared public in the schema are emitted, and model fields
     * are transformed through codecs when configured.
     */
    protected parseFieldsToDbData(): GameNoncustomDbDataFromFields<T> {
        const modelData = this as unknown as Record<string, unknown>;
        const parsed: Record<string, unknown> = {};

        for (const [fieldKey, field] of Object.entries(this.fields)) {
            switch (field.flavour) {
                case "kind":
                case "name":
                case "title":
                    parsed[fieldKey] = modelData[fieldKey];
                    break;
                case "definition":
                    if (field.visibility === "public") parsed[fieldKey] = modelData[fieldKey];
                    break;
                case "model":
                    if (field.visibility === "public") {
                        parsed[fieldKey] = field.codec?.encode(modelData[fieldKey]) ?? modelData[fieldKey];
                    }
                    break;
            }
        }

        return parsed as GameNoncustomDbDataFromFields<T>;
    }
}

/** Concrete model instance including generated definition and model field properties. */
export type CompleteGameModel<T extends AnyFieldsObject> = GameModel<T> & GameModelDataFromFields<T>;