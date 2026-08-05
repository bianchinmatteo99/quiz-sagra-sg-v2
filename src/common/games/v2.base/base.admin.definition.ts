import { MDUtils } from "../../md.utils";
import { AnyFieldsObject, Default, GameAdditionalDefinitionDataFromFields, GameDefinitionDataFromFields, GameRequiredDataFromFields, RequiredFieldError, ValidationError } from "./base.admin.contracts";


/**
 * Base runtime definition wrapper for field-based game implementations.
 *
 * Subclasses typically only provide a concrete generic argument and are merged
 * with their generated definition-data interface.
 */
export abstract class GameDefinition<T extends AnyFieldsObject> {
    readonly id: number;

    /**
     * @param id Zero-based index of the game inside the quiz definition.
     * @param def Parsed definition payload.
     */
    constructor(id: number, def: GameDefinitionDataFromFields<T>) {
        this.id = id;
        Object.assign(this, def);
    }
}

/** Concrete definition instance including required identity and additional definition fields. */
export type CompleteGameDefinition<T extends AnyFieldsObject> = GameDefinition<T> & GameRequiredDataFromFields<T> & GameAdditionalDefinitionDataFromFields<T>;
/** Broad definition type used by generic managers/controllers in field-based v2 games. */
export type AnyGameDefinition = GameDefinition<any> & GameRequiredDataFromFields;

/**
 * Generic parser for field-based game definitions.
 *
 * It consumes a field schema and produces validated, typed definition payloads
 * from either markdown sections or persisted JSON snapshots.
 */
export abstract class GameDefinitionBuilder<T extends AnyFieldsObject> {
    /** Field schema used to parse and validate this game definition. */
    readonly fields: T;

    constructor(fields: T) {
        this.fields = fields;
    }

    private resolveDefault<TValue>(value: Default<TValue>): TValue {
        return typeof value === "function" ? (value as () => TValue)() : value;
    }

    /**
     * Parse one game definition section from markdown.
     *
     * Validates allowed keys, applies field parsers, enforces required fields,
     * and executes optional field validators.
     *
     * @param md Markdown content for a single game block.
     * @returns Fully typed definition payload.
     * @throws RequiredFieldError If a required definition key is missing.
     * @throws ValidationError If key values violate parser or validator constraints.
     */
    parseFromMD(md: string): GameDefinitionDataFromFields<T> {
        const parsed = MDUtils.parseSectionContent(md);
        const kind = this.fields.kind.value;
        const name = this.fields.name.value;

        const result = {
            kind,
            name,
            title: MDUtils.parseString(parsed, "title", name),
        } as Record<string, unknown>;

        const allowedKeys = ["title"];
        for (const field of Object.values(this.fields)) {
            if (field.flavour === "definition") {
                allowedKeys.push(field.mdkey);
            }
        }
        MDUtils.ensureOnlyAllowedKeys(parsed, allowedKeys, kind, true);

        for (const [fieldKey, field] of Object.entries(this.fields) as [keyof T, T[keyof T]][]) {
            if (field.flavour !== "definition") {
                continue;
            }

            const raw = parsed[field.mdkey];
            let value: unknown;
            if (raw === undefined) {
                if (field.default === undefined) {
                    throw new RequiredFieldError(`Missing required key "${field.mdkey}" for game "${kind}"`);
                }
                value = this.resolveDefault(field.default);
            } else {
                value = field.parser(raw, `${kind}.${field.mdkey}`);
            }

            const validation = field.validator?.(value as never);
            if (validation) {
                throw validation;
            }

            result[fieldKey as string] = value;
        }

        return result as GameDefinitionDataFromFields<T>;
    }

    /**
     * Parse one game definition object from persisted JSON.
     *
     * Identity fields are normalized from schema defaults and validated against
     * optional incoming values; missing definition fields are resolved from
     * schema defaults when available.
     *
     * @param data Partial serialized definition payload.
     * @returns Fully typed definition payload.
     * @throws RequiredFieldError If a required field has no stored value and no default.
     * @throws ValidationError If identity mismatches or validators fail.
     */
    parseFromJSON(data: Partial<GameDefinitionDataFromFields<T>>): GameDefinitionDataFromFields<T> {
        const kind = this.fields.kind.value;
        const name = this.fields.name.value;
        const dataRecord = data as Record<string, unknown>;

        if (dataRecord.kind !== undefined && dataRecord.kind !== kind) {
            throw new ValidationError(`Invalid kind in definition JSON: expected "${kind}", found "${String(dataRecord.kind)}"`);
        }
        if (dataRecord.name !== undefined && dataRecord.name !== name) {
            throw new ValidationError(`Invalid name in definition JSON: expected "${name}", found "${String(dataRecord.name)}"`);
        }

        const result = {
            kind,
            name,
            title: (typeof dataRecord.title === "string" ? dataRecord.title : name),
        } as Record<string, unknown>;

        for (const [fieldKey, field] of Object.entries(this.fields) as [keyof T, T[keyof T]][]) {
            if (field.flavour !== "definition") {
                continue;
            }

            const raw = (data as Record<string, unknown>)[fieldKey as string];
            let value: unknown;
            if (raw === undefined) {
                if (field.default === undefined) {
                    throw new RequiredFieldError(`Missing required field "${String(fieldKey)}" in definition JSON for game "${kind}"`);
                }
                value = this.resolveDefault(field.default);
            } else {
                value = raw;
            }

            const validation = field.validator?.(value as never);
            if (validation) {
                throw validation;
            }

            result[fieldKey as string] = value;
        }

        return result as GameDefinitionDataFromFields<T>;
    }
}