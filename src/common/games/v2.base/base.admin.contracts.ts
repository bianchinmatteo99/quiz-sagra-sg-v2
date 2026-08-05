
/** Thrown when a required definition key is missing during parsing. */
export class RequiredFieldError extends Error { }

/** Thrown when a parsed value does not satisfy expected format or constraints. */
export class ValidationError extends Error { }

interface Codec<T, S> {
    encode(x: T): S;
    decode(y: S): T | null;
}

/**
 * Parses one markdown value (single string or list entry block) into a typed value.
 *
 * @typeParam T Resulting parsed type.
 */
export type Parser<T> = (def: string | string[], key: string) => T;

/** Value or lazy factory used to initialize defaults for fields. */
export type Default<T> = T | (() => T);
type InputProvider<T> = {};

type EnumLike = Record<string, string | number>;

/** Collection of reusable field parsers for game-definition markdown keys. */
export class Parsers {
    /** Parse a single string value. */
    static string(x: string | string[], key: string): string {
        if (Array.isArray(x)) throw new ValidationError(`Key \"${key}\" must be a single string, found a list.`);
        return x;
    }

    /** Parse a single numeric value using JavaScript number conversion. */
    static number(x: string | string[], key: string): number {
        if (Array.isArray(x)) throw new ValidationError(`Key \"${key}\" must be a single number, found a list.`);
        return Number(x);
    }

    /** Parse a strict boolean value from "true" or "false" (case-insensitive). */
    static boolean(x: string | string[], key: string): boolean {
        if (Array.isArray(x)) throw new ValidationError(`Key \"${key}\" must be a single boolean (either 'true' or 'false'), found a list.`);
        const normalized = x.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
        throw new ValidationError(`Key \"${key}\" must be a boolean (either 'true' or 'false'), found '${x}'`);
    }

    /**
     * Build a parser that only accepts one of the provided string literals.
     *
     * @param allowed Allowed string values.
     */
    static oneOf<const T extends readonly string[]>(allowed: T): Parser<T[number]> {
        return (value, key) => {
            const str = Parsers.string(value, key);
            if (!allowed.includes(str)) {
                throw new ValidationError(`Key "${key}" must be one of: ${allowed.join(", ")}; found "${str}".`);
            }

            return str as T[number];
        };
    }

    /**
     * Build a parser that resolves a key of a TypeScript enum-like object.
     *
     * Numeric reverse-mapping keys are ignored.
     */
    static enumValue<T extends EnumLike>(enumType: T): Parser<T[keyof T]> {
        return (value, key) => {
            const str = Parsers.string(value, key);
            const enumKeys = Object.keys(enumType).filter(k => Number.isNaN(Number(k)));
            if (!enumKeys.includes(str)) {
                throw new ValidationError(`Key "${key}" must be one of: ${enumKeys.join(", ")}; found "${str}".`);
            }
            return enumType[str as keyof T];
        };
    }

    /**
     * Build a list parser from an item parser.
     *
     * @param internalParser Parser applied to each list element.
     */
    static getListParserFor<T>(internalParser: Parser<T>): Parser<T[]> {
        return (def, key) => Parsers.list(internalParser, def, key);
    }

    /**
     * Parse a non-empty markdown list and map each element through an item parser.
     */
    static list<T>(internalParser: Parser<T>, value: string | string[], key: string): T[] {
        if (!Array.isArray(value)) {
            throw new Error(`Key \"${key}\" must be a list and use one \"- value\" line per item`);
        }
        if (value.length === 0) {
            throw new Error(`Key \"${key}\" must contain at least one item`);
        }

        const normalized = value.map((item) => item.trim());
        if (normalized.some((item) => item.length === 0)) {
            throw new Error(`Key \"${key}\" cannot contain empty list items`);
        }

        return normalized.map(v => internalParser(v, key));
    }
}

interface RequiredKindField<T> {
    flavour: "kind";
    value: T;
}

interface RequiredNameField<T> {
    flavour: "name";
    value: T;
}

interface OptionalTitleField<T> {
    flavour: "title";
}

type FieldVisibility = "private" | "public";

interface BaseField<T, V extends FieldVisibility = FieldVisibility> {
    visibility: V;
    manualchange?: InputProvider<T>;
    views?: { showin: "admin" | "presenter" | "both", descr?: string, translate?: (value: T) => string };
}

interface DefinitionField<T, V extends FieldVisibility = FieldVisibility> extends BaseField<T, V> {
    flavour: "definition";
    mdkey: string;
    parser: Parser<T>;
    default?: Default<T>;
    validator?: (unsafe: T) => null | ValidationError;
}

interface ModelSimpleField<T, PT = T, V extends FieldVisibility = FieldVisibility> extends BaseField<T, V> {
    flavour: "model";
    default: Default<T>;
    codec?: Codec<T, PT>;
}

interface CustomDbField<T> {
    flavour: "custom";
    visibility: "public";
}

type RequiredField<T> = RequiredKindField<T> | RequiredNameField<T> | OptionalTitleField<string>;
type Field<T> = RequiredField<T> | DefinitionField<T, any> | ModelSimpleField<T, any, any> | CustomDbField<T>;

export interface RequiredFieldsObject<T, N> {
    kind: RequiredKindField<T>;
    name: RequiredNameField<N>;
    title: OptionalTitleField<string>;
}

/**
 * Create the mandatory identity fields for a game schema.
 */
export function required<const K extends string, const N extends string>(kind: K, name: N): RequiredFieldsObject<K, N> {
    return {
        kind: { flavour: "kind", value: kind },
        name: { flavour: "name", value: name },
        title: { flavour: "title" },
    };
}

/** Create a game-definition field descriptor parsed from markdown/json definition data. */
export function definition<T, V extends FieldVisibility>(d: Omit<DefinitionField<T, V>, "flavour">): DefinitionField<T, V> {
    return { flavour: "definition", ...d };
}

/** Create a runtime model field descriptor persisted in game state snapshots. */
export function model<T, PT = T, V extends FieldVisibility = FieldVisibility>(d: Omit<ModelSimpleField<T, PT, V>, "flavour">): ModelSimpleField<T, PT, V> {
    return { flavour: "model", ...d };
}

/** Create a public custom database field placeholder handled by concrete models. */
export function customDbKey<T>(): CustomDbField<T> {
    return { flavour: "custom", visibility: "public" };
}

/**
 * Helper used to preserve literal inference and field-map typing.
 */
export function defineFields<const T extends RequiredFieldsObject<string, string>>(fields: T): T { return fields; }

/** Union-friendly field-schema map containing required, definition, model, and custom field metadata. */
export type AnyFieldsObject = RequiredFieldsObject<string, string> & { [K: string]: Field<any> };

type KeysMatching<T, C> = {
    [K in keyof T]-?: T[K] extends C ? K : never;
}[keyof T];

type RequiredKeys<TFields extends RequiredFieldsObject<string, string>> = KeysMatching<TFields, RequiredField<string>>;
type DefinitionKeys<TFields extends AnyFieldsObject> = KeysMatching<TFields, DefinitionField<any, any>>;
type ModelKeys<TFields extends AnyFieldsObject> = KeysMatching<TFields, ModelSimpleField<any, any, any>>;
type CustomDbKeys<TFields extends AnyFieldsObject> = KeysMatching<TFields, CustomDbField<any>>;
type PublicBaseFieldKeys<TFields extends AnyFieldsObject> = {
    [K in keyof TFields]-?: TFields[K] extends BaseField<any, any>
        ? TFields[K]["visibility"] extends "public" ? K : never
        : never;
}[keyof TFields];

type RequiredValue<TField> =
    TField extends RequiredKindField<infer K> ? K :
    TField extends RequiredNameField<infer N> ? N :
    TField extends OptionalTitleField<any> ? string :
    never;

type DefinitionValue<TField> = TField extends DefinitionField<infer T, any> ? T : never;
type ModelValue<TField> = TField extends ModelSimpleField<infer T, any, any> ? T : never;
type ModelDbValue<TField> = TField extends ModelSimpleField<any, infer PT, any> ? PT : never;
type CustomDbValue<TField> = TField extends CustomDbField<infer T> ? T : never;

/** Required identity payload always present in game definitions. */
export type GameRequiredDataFromFields<TFields extends RequiredFieldsObject<string, string> = RequiredFieldsObject<string, string>> = {
    kind: TFields["kind"]["value"];
    name: TFields["name"]["value"];
    title: string;
};

/** Additional parsed definition payload derived from all definition fields. */
export type GameAdditionalDefinitionDataFromFields<TFields extends AnyFieldsObject> = {
    [K in DefinitionKeys<TFields>]: DefinitionValue<TFields[K]>;
};

/** Complete serialized definition payload (required identity + definition fields). */
export type GameDefinitionDataFromFields<TFields extends AnyFieldsObject> = {
    [K in RequiredKeys<TFields> | DefinitionKeys<TFields>]:
        TFields[K] extends DefinitionField<any, any>
            ? DefinitionValue<TFields[K]>
            : RequiredValue<TFields[K]>;
};

/** In-memory model payload (definition payload plus model fields). */
export type GameModelDataFromFields<TFields extends AnyFieldsObject> = {
    [K in RequiredKeys<TFields> | DefinitionKeys<TFields> | ModelKeys<TFields>]:
        TFields[K] extends ModelSimpleField<any, any, any>
            ? ModelValue<TFields[K]>
            : TFields[K] extends DefinitionField<any, any>
                ? DefinitionValue<TFields[K]>
                : RequiredValue<TFields[K]>;
};

/** Publicly persisted game-state payload written to the realtime database. */
export type GameDbDataFromFields<TFields extends AnyFieldsObject> = {
    [K in RequiredKeys<TFields> | PublicBaseFieldKeys<TFields>]:
        TFields[K] extends ModelSimpleField<any, any>
            ? ModelDbValue<TFields[K]>
            : TFields[K] extends CustomDbField<any>
                ? CustomDbValue<TFields[K]>
                : TFields[K] extends DefinitionField<any, any>
                    ? DefinitionValue<TFields[K]>
                    : RequiredValue<TFields[K]>;
};

/** Persisted game-state payload excluding custom DB fields managed manually by subclasses. */
export type GameNoncustomDbDataFromFields<TFields extends AnyFieldsObject> = {
    [K in Exclude<RequiredKeys<TFields> | PublicBaseFieldKeys<TFields>, CustomDbKeys<TFields>>]:
        TFields[K] extends ModelSimpleField<any, any>
            ? ModelDbValue<TFields[K]>
            : TFields[K] extends CustomDbField<any>
                ? never
                : TFields[K] extends DefinitionField<any, any>
                    ? DefinitionValue<TFields[K]>
                    : RequiredValue<TFields[K]>;
};

