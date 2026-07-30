import { MDUtils } from "../md.utils";
import { BaseModel, BaseModelContext } from "../admin.utils";
import { GameDefinition } from "./games.admin.base";
import { GameRequiredData } from "./games.contracts";

export interface Codec<T, S> {
    encode(x: T): S;
    decode(y: S): T | null;
}

export class RequiredFieldError extends Error { }
export class ValidationError extends Error { }

export interface Field<T> {
    runtime: boolean;
    publish: boolean;
}

export type Parser<T> = (def: string | string[], key: string) => T | null;
export type Default<T> = T | (() => T);

export type DefinitionField<T> = Field<T> & {
    mdkey: string;
    parser: Parser<T>;
    validation?: (unsafe: T) => ValidationError | true;
};

export type OptionalDefinitionField<T> = DefinitionField<T> & {
    default: Default<T>;
};

export type RequiredDefinitionField<T> = DefinitionField<T> & {
    default: RequiredFieldError;
};

export type RuntimeField<T, PT = T> = Field<T> & {
    runtime: true;
    default: Default<T>;
    codec?: Codec<T, PT>;
};

export class Parsers {
    static string(x: string | string[], key: string): string {
        if (Array.isArray(x)) throw new Error();
        return x;
    }

    static number(x: string | string[], key: string): number {
        return Number(x);
    }

    static boolean(x: string | string[], key: string): boolean | null {
        if (Array.isArray(x)) throw new Error();
        const normalized = x.trim().toLowerCase();
        if (normalized === "true") {
            return true;
        }
        if (normalized === "false") {
            return false;
        }
        return null;
    }

    static stringList(value: string | string[], key: string): string[] {
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

        return normalized;
    }
}

export function definition(d: Omit<DefinitionField<string>, "parser"> & { default: Default<string>; parser?: undefined }): OptionalDefinitionField<string>;
export function definition(d: Omit<DefinitionField<string>, "parser"> & { default?: undefined; parser?: undefined }): RequiredDefinitionField<string>;
export function definition<T>(d: Omit<DefinitionField<T>, "parser"> & { default: Default<T>; parser: Parser<T> }): OptionalDefinitionField<T>;
export function definition<T>(d: Omit<DefinitionField<T>, "parser"> & { default?: undefined; parser: Parser<T> }): RequiredDefinitionField<T>;
export function definition(d: any): any {
    if (d.default !== undefined) {
        return {
            ...d,
            parser: d.parser ?? Parsers.string,
        } as OptionalDefinitionField<any>;
    }

    return {
        ...d,
        default: new RequiredFieldError(),
        parser: d.parser ?? Parsers.string,
    } as RequiredDefinitionField<any>;
}

export function runtime<T>(r: Omit<RuntimeField<T>, "codec" | "runtime">): RuntimeField<T>;
export function runtime<T, PT>(r: Omit<RuntimeField<T>, "codec" | "runtime"> & { codec: Codec<T, PT> }): RuntimeField<T, PT>;
export function runtime<T, PT = T>(r: Omit<RuntimeField<T, PT>, "runtime">): RuntimeField<T, PT> {
    return {
        runtime: true,
        ...r,
    };
}

export function defineFields<T extends Record<string, Field<unknown>>>(fields: T): T {
    return fields;
}

export type AnyFieldRecord = Record<string, Field<any>>;
export type AnyDefinitionField = DefinitionField<any> & { default: Default<any> | RequiredFieldError };

export type DefinitionKeys<TFields extends AnyFieldRecord> = {
    [K in keyof TFields]-?: TFields[K] extends { mdkey: string; parser: (...args: any[]) => any } ? K : never;
}[keyof TFields];

export type RuntimeDefinitionKeys<TFields extends AnyFieldRecord> = {
    [K in keyof TFields]-?: TFields[K] extends { mdkey: string; parser: (...args: any[]) => any; runtime: boolean }
        ? TFields[K]["runtime"] extends true
            ? K
            : never
        : never;
}[keyof TFields];

export type RuntimeOnlyKeys<TFields extends AnyFieldRecord> = {
    [K in keyof TFields]-?: TFields[K] extends { runtime: true; default: Default<any> }
        ? TFields[K] extends { mdkey: string }
            ? never
            : K
        : never;
}[keyof TFields];

export type DefinitionValue<TField> =
    TField extends OptionalDefinitionField<infer T> ? T :
    TField extends RequiredDefinitionField<infer T> ? T :
    TField extends DefinitionField<infer T> ? T :
    never;

export type RuntimeValue<TField> = TField extends RuntimeField<infer T, any> ? T : never;

export type RuntimePersistedValue<TField> =
    TField extends RuntimeField<any, infer PT> ? PT :
    TField extends { default: Default<infer T> } ? T :
    never;

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type GameDefinitionDataBase<K extends GameRequiredData> = {
    kind: K["kind"];
    name: K["name"];
    title: string;
};

export type GameStateSnapshotBaseLocal<K extends GameRequiredData> = {
    kind: K["kind"];
    name: K["name"];
    title: string;
};

export type GameDefinitionDataFromFields<
    TRequiredData extends GameRequiredData,
    TFields extends AnyFieldRecord
> = Simplify<
    GameDefinitionDataBase<TRequiredData> & {
        [K in DefinitionKeys<TFields>]: DefinitionValue<TFields[K]>;
    }
>;

export type GameStateSnapshotFromFields<
    TRequiredData extends GameRequiredData,
    TFields extends AnyFieldRecord
> = Simplify<
    GameStateSnapshotBaseLocal<TRequiredData> & {
        [K in RuntimeDefinitionKeys<TFields>]: DefinitionValue<TFields[K]>;
    } & {
        [K in RuntimeOnlyKeys<TFields>]: RuntimeValue<TFields[K]>;
    }
>;

export type GameStateSnapshotDatabaseFromFields<
    TRequiredData extends GameRequiredData,
    TFields extends AnyFieldRecord
> = Simplify<
    GameStateSnapshotBaseLocal<TRequiredData> & {
        [K in RuntimeDefinitionKeys<TFields>]: DefinitionValue<TFields[K]>;
    } & {
        [K in RuntimeOnlyKeys<TFields>]: RuntimePersistedValue<TFields[K]>;
    }
>;

export function resolveDefaultValue<T>(value: Default<T>): T {
    return typeof value === "function" ? (value as () => T)() : value;
}

export function isDefinitionField(field: Field<unknown>): field is AnyDefinitionField {
    return "mdkey" in (field as object) && "parser" in (field as object);
}

export function isRuntimeField(field: Field<unknown>): field is RuntimeField<unknown, unknown> {
    return field.runtime === true && "default" in (field as object) && !("mdkey" in (field as object));
}

export abstract class GameDefinitionBuilder<
    TRequiredData extends GameRequiredData,
    TFields extends AnyFieldRecord
> {
    abstract readonly requiredData: TRequiredData;
    abstract readonly fields: TFields;

    parseFromMD(md: string): GameDefinitionDataFromFields<TRequiredData, TFields> {
        const parsed = MDUtils.parseSectionContent(md);
        const result = ({
            ...this.requiredData,
            title: MDUtils.parseString(parsed, "title", this.requiredData.name),
        } as unknown) as Record<string, unknown>;

        const allowed = ["title"];
        for (const field of Object.values(this.fields)) {
            if (isDefinitionField(field)) {
                allowed.push(field.mdkey);
            }
        }

        MDUtils.ensureOnlyAllowedKeys(parsed, allowed, this.requiredData.kind)

        for (const [fieldKey, field] of Object.entries(this.fields)) {
            if (!isDefinitionField(field)) {
                continue;
            }

            const rawValue = parsed[field.mdkey];
            let value: unknown;
            if (rawValue === undefined) {
                if (field.default instanceof RequiredFieldError) {
                    throw new Error(`Missing required key \"${field.mdkey}\"`);
                }
                value = resolveDefaultValue(field.default);
            } else {
                value = field.parser(rawValue, field.mdkey);
                if (value === null) {
                    throw new Error(`Invalid value for key \"${field.mdkey}\"`);
                }
            }

            if (field.validation) {
                const validationResult = field.validation(value);
                if (validationResult !== true) {
                    throw validationResult;
                }
            }

            result[fieldKey] = value;
        }

        return result as GameDefinitionDataFromFields<TRequiredData, TFields>;
    }

    parseFromJSON(data: Partial<GameDefinitionDataFromFields<TRequiredData, TFields>>): GameDefinitionDataFromFields<TRequiredData, TFields> {
        const result = ({
            ...this.requiredData,
            title: (data.title ?? this.requiredData.name),
        } as unknown) as Record<string, unknown>;

        for (const [fieldKey, field] of Object.entries(this.fields)) {
            if (!isDefinitionField(field)) {
                continue;
            }

            const rawValue = (data as Record<string, unknown>)[fieldKey];
            let value: unknown;

            if (rawValue === undefined) {
                if (field.default instanceof RequiredFieldError) {
                    throw new Error(`Missing required key \"${fieldKey}\" in JSON data`);
                }
                value = resolveDefaultValue(field.default);
            } else {
                value = rawValue;
            }

            if (field.validation) {
                const validationResult = field.validation(value as never);
                if (validationResult !== true) {
                    throw validationResult;
                }
            }

            result[fieldKey] = value;
        }

        return result as GameDefinitionDataFromFields<TRequiredData, TFields>;
    }
}

export abstract class GameModel<
    TRequiredData extends GameRequiredData,
    TFields extends AnyFieldRecord,
> extends BaseModel<GameStateSnapshotDatabaseFromFields<TRequiredData, TFields>> {
    readonly DBPATH = "/state/game";

    context: GameModelContext;

    abstract readonly fields: TFields;
    abstract readonly definition: GameDefinition<GameDefinitionDataFromFields<TRequiredData, TFields>>;

    constructor(ctx: GameModelContext) {
        super();
        this.context = ctx;
    }

    protected initModel(): void {
        for (const [fieldKey, field] of Object.entries(this.fields)) {
            if (isDefinitionField(field) && field.runtime === true) {
                (this as Record<string, unknown>)[fieldKey] = (this.definition.data as Record<string, unknown>)[fieldKey];
                continue;
            }
            if (isRuntimeField(field)) {
                (this as Record<string, unknown>)[fieldKey] = resolveDefaultValue(field.default);
            }
        }
    }

    parseFromJSON(data: Partial<GameStateSnapshotDatabaseFromFields<TRequiredData, TFields>>): boolean {
        for (const [fieldKey, field] of Object.entries(this.fields)) {
            const serialized = (data as Record<string, unknown>)[fieldKey];

            if (isDefinitionField(field) && field.runtime === true) {
                (this as Record<string, unknown>)[fieldKey] = serialized ?? (this.definition.data as Record<string, unknown>)[fieldKey];
                continue;
            }

            if (!isRuntimeField(field)) {
                continue;
            }

            if (serialized === undefined) {
                (this as Record<string, unknown>)[fieldKey] = resolveDefaultValue(field.default);
                continue;
            }

            if (field.codec) {
                const decoded = (field.codec as Codec<unknown, unknown>).decode(serialized);
                if (decoded === null) {
                    return false;
                }
                (this as Record<string, unknown>)[fieldKey] = decoded;
            } else {
                (this as Record<string, unknown>)[fieldKey] = serialized;
            }
        }
        return true;
    }

    toJSON(): GameStateSnapshotDatabaseFromFields<TRequiredData, TFields> {
        const json = ({
            kind: this.definition.data.kind,
            name: this.definition.data.name,
            title: this.definition.data.title,
        } as unknown) as Record<string, unknown>;

        for (const [fieldKey, field] of Object.entries(this.fields)) {
            if (isDefinitionField(field) && field.runtime === true) {
                json[fieldKey] = (this as Record<string, unknown>)[fieldKey];
                continue;
            }

            if (!isRuntimeField(field)) {
                continue;
            }

            const rawValue = (this as Record<string, unknown>)[fieldKey];
            if (field.codec) {
                json[fieldKey] = (field.codec as Codec<unknown, unknown>).encode(rawValue);
            } else {
                json[fieldKey] = rawValue;
            }
        }

        return json as GameStateSnapshotDatabaseFromFields<TRequiredData, TFields>;
    }
}

export type GameModelProperties<
    TFields extends AnyFieldRecord
> = {
    [K in RuntimeDefinitionKeys<TFields>]: DefinitionValue<TFields[K]>;
} & {
    [K in RuntimeOnlyKeys<TFields>]: RuntimeValue<TFields[K]>;
};

export interface GameModelContext extends BaseModelContext {}
