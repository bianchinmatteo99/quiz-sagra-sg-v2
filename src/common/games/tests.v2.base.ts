import { BaseModel, BaseModelContext, ResumeCheckpoints } from "../admin.utils";
import { IDatabaseAdapter } from "../database/database.types";
import { toHtml } from "../general.utils";
import { MDUtils } from "../md.utils";
import { RankingDiff } from "../people/people.controller";
import { Person } from "../people/people.model";
import { Question, QuestionContext } from "../questions/questions.admin.base";
import { GameRequiredData } from "./games.contracts";

export class RequiredFieldError extends Error { }
export class ValidationError extends Error { }

interface Codec<T, S> {
    encode(x: T): S;
    decode(y: S): T | null;
}
type Parser<T> = (def: string | string[], key: string) => T;
type Default<T> = T | (() => T);
type InputProvider<T> = {} // TODO

type EnumLike = Record<string, string | number>;
export class Parsers {
    static string(x: string | string[], key: string): string {
        if (Array.isArray(x)) throw new ValidationError(`Key \"${key}\" must be a single string, found a list.`);
        return x;
    }

    static number(x: string | string[], key: string): number {
        if (Array.isArray(x)) throw new ValidationError(`Key \"${key}\" must be a single number, found a list.`);
        return Number(x);
    }

    static boolean(x: string | string[], key: string): boolean {
        if (Array.isArray(x)) throw new ValidationError(`Key \"${key}\" must be a single boolean (either 'true' or 'false'), found a list.`);
        const normalized = x.trim().toLowerCase();
        if (normalized === "true") {
            return true;
        }
        if (normalized === "false") {
            return false;
        }
        throw new ValidationError(`Key \"${key}\" must be a boolean (either 'true' or 'false'), found '${x}'`);
    }


    static oneOf<const T extends readonly string[]>(allowed: T): Parser<T[number]> {
        return (value, key) => {
            const str = Parsers.string(value, key);
            if (!allowed.includes(str)) {
                throw new ValidationError(`Key "${key}" must be one of: ${allowed.join(", ")}; found "${str}".`);
            }

            return str as T[number];
        }
    }

    static enumValue<T extends EnumLike>(enumType: T): Parser<T[keyof T]> {
        return (value, key) => {
            const str = Parsers.string(value, key);

            // Exclude numeric reverse-mapping keys from numeric enums
            const enumKeys = Object.keys(enumType).filter(k => Number.isNaN(Number(k)));

            if (!enumKeys.includes(str)) {
                throw new ValidationError(
                    `Key "${key}" must be one of: ${enumKeys.join(", ")}; found "${str}".`
                );
            }

            return enumType[str as keyof T];
        };
    }

    static getListParserFor<T>(internalParser: Parser<T>): Parser<T[]> {
        return (def, key) => Parsers.list(internalParser, def, key)
    }

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
    visibility: V
    manualchange?: InputProvider<T>
    views?: { showin: "admin"|"presenter"|"both", descr?: string, translate?: (value: T) => string }
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

type RequiredField<T> = RequiredKindField<T> | RequiredNameField<T> | OptionalTitleField<string>
type Field<T> = RequiredField<T> | DefinitionField<T, any> | ModelSimpleField<T, any, any> | CustomDbField<T>
interface RequiredFieldsObject<T, N> {
    kind: RequiredKindField<T>;
    name: RequiredNameField<N>;
    title: OptionalTitleField<string>;
}

export function required<const K extends string,const N extends string>(kind: K, name: N): RequiredFieldsObject<K, N> {
    return {
        kind: { flavour: "kind", value: kind },
        name: { flavour: "name", value: name },
        title: { flavour: "title" },
    };
}

export function definition<T, V extends FieldVisibility>(d: Omit<DefinitionField<T, V>, "flavour">): DefinitionField<T, V> {
    return { flavour: "definition", ...d };
}

export function model<T, PT = T, V extends FieldVisibility = FieldVisibility>(d: Omit<ModelSimpleField<T, PT, V>, "flavour">): ModelSimpleField<T, PT, V> {
    return { flavour: "model", ...d };
}

export function customDbKey<T>(): CustomDbField<T> {
    return { flavour: "custom", visibility: "public" };
}

export function defineFields<const T extends RequiredFieldsObject<string,string>>(fields: T): T {return fields;}


type AnyFieldsObject = RequiredFieldsObject<string,string> & {[K: string]: Field<any>};

type KeysMatching<T, C> = {
    [K in keyof T]-?: T[K] extends C ? K : never;
}[keyof T];

type RequiredKeys<TFields extends RequiredFieldsObject<string,string>> = KeysMatching<TFields, RequiredField<string>>;
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

export type GameRequiredDataFromFields<TFields extends RequiredFieldsObject<string,string> = RequiredFieldsObject<string,string>> = {
    kind: TFields["kind"]["value"];
    name: TFields["name"]["value"];
    title: string;
}

export type GameAdditionalDefinitionDataFromFields<TFields extends AnyFieldsObject> = {
    [K in DefinitionKeys<TFields>]: DefinitionValue<TFields[K]>;
};

export type GameDefinitionDataFromFields<TFields extends AnyFieldsObject> = {
    [K in RequiredKeys<TFields> | DefinitionKeys<TFields>]:
        TFields[K] extends DefinitionField<any, any>
            ? DefinitionValue<TFields[K]>
            : RequiredValue<TFields[K]>;
};

export type GameModelDataFromFields<TFields extends AnyFieldsObject> = {
    [K in RequiredKeys<TFields> | DefinitionKeys<TFields> | ModelKeys<TFields>]:
        TFields[K] extends ModelSimpleField<any, any, any>
            ? ModelValue<TFields[K]>
            : TFields[K] extends DefinitionField<any, any>
                ? DefinitionValue<TFields[K]>
                : RequiredValue<TFields[K]>;
};

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




export abstract class GameDefinition<T extends AnyFieldsObject> {
    readonly id: number;
    
    constructor(id: number, def: GameDefinitionDataFromFields<T>) {
        this.id = id;
        Object.assign(this, def);
    }
}
export type CompleteGameDefinition<T extends AnyFieldsObject> = GameDefinition<T> & GameRequiredDataFromFields<T> & GameAdditionalDefinitionDataFromFields<T>


export abstract class GameDefinitionBuilder<T extends AnyFieldsObject> {
    readonly fields: T;
    constructor(fields: T){
        this.fields = fields;
    }

    private resolveDefault<TValue>(value: Default<TValue>): TValue {
        return typeof value === "function" ? (value as () => TValue)() : value;
    }

    /**
     * Parse a game definition from Markdown section text.
     * @param md - Markdown section content for this game (without the `## <game>` heading)
     * @returns Parsed game data payload
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
     * Parse a game definition from persisted JSON (e.g., from database).
     * @param data - Serialized definition payload
     * @returns Parsed game data payload
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


export interface GameModelContext extends BaseModelContext {}
export abstract class GameModel<T extends AnyFieldsObject> extends BaseModel<GameDbDataFromFields<T>> {
    /** Database path where game state is persisted. */
    readonly DBPATH = "/state/game";

    readonly fields: T;
    /** The immutable game definition containing rules and configuration. */
    readonly definition: CompleteGameDefinition<T>;

    /** Context used for persistence and state-update notifications. */
    context: GameModelContext;

    private resolveDefault<TValue>(value: Default<TValue>): TValue {
        return typeof value === "function" ? (value as () => TValue)() : value;
    }


    protected parseFieldsFromDbData(data: Partial<GameDbDataFromFields<T>>): GameNoncustomDbDataFromFields<T> {
        const definitionData = this.definition as unknown as Record<string, unknown>;
        const dbData = data as Record<string, unknown>;
        const parsed: Record<string, unknown> = {};

        for (const [fieldKey, field] of Object.entries(this.fields)) {
            
            switch(field.flavour){
                case "title":
                    const fromDb = dbData[fieldKey];
                    parsed[fieldKey] = fromDb !== undefined ? fromDb : definitionData[fieldKey];
                    break;
                case "definition":
                    if (field.visibility === "public") {
                        const fromDb = dbData[fieldKey];
                        parsed[fieldKey] = fromDb !== undefined ? fromDb : definitionData[fieldKey];
                    }
                    break;
                case "model":
                    if (field.visibility === "public") {
                        const fromDb = dbData[fieldKey];
                        if (fromDb === undefined) {
                            parsed[fieldKey] = this.resolveDefault(field.default);
                        } else if (!field.codec) {
                            parsed[fieldKey] = fromDb;
                        } else {
                            const decoded = field.codec.decode(fromDb);
                            parsed[fieldKey] = decoded !== null ? decoded : this.resolveDefault(field.default);
                        }
                    }
                    break;
            }
        }

        return parsed as GameNoncustomDbDataFromFields<T>;
    }

    protected parseFieldsToDbData(): GameNoncustomDbDataFromFields<T> {
        const modelData = this as unknown as Record<string, unknown>;
        const parsed: Record<string, unknown> = {};

        for (const [fieldKey, field] of Object.entries(this.fields)) {
            switch (field.flavour) {
                case "kind":
                case "name":
                case "title": {
                    parsed[fieldKey] = modelData[fieldKey];
                    break;
                }
                case "definition":
                    if (field.visibility === "public") { 
                        parsed[fieldKey] = modelData[fieldKey];
                    }
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

    constructor(ctx: GameModelContext, definition: CompleteGameDefinition<T>, fields: T) {
        super();
        this.context = ctx;
        this.definition = definition;
        this.fields = fields;

        Object.assign(this, definition);

        const target = this as Record<string, unknown>;
        for (const [fieldKey, field] of Object.entries(fields)) {
            if (field.flavour !== "model") {
                continue;
            }

            target[fieldKey] = this.resolveDefault(field.default);
        }
    }

    

}
export type CompleteGameModel<T extends AnyFieldsObject> = GameModel<T> & GameModelDataFromFields<T>


export interface GameViewContext<T extends AnyFieldsObject> {
    model: CompleteGameModel<T>
}


export abstract class GameView<T extends AnyFieldsObject> {
    abstract fields: T

    /** DOM id for the timeline container (step-by-step progression display). */
    readonly timelineContainer = "game-timeline";

    /** DOM id for the game current-state wrapper. */
    readonly currentStateContainer = "game-current-state";

    /** DOM id for the game current-state content (inner). */
    readonly currentStateContent = "game-current-state-content";

    /** Whether the timeline is currently being rendered. */
    isDisplayingTimeline: boolean = false;

    /** The active game context (usually the controller). Null if game is not running. */
    abstract activeGameContext: GameViewContext<T> | null;

    /** The immutable game definition for rendering rules and metadata. */
    abstract gameDef: CompleteGameDefinition<T>;

    /** Controls lifecycle of DOM listeners attached by this view. */
    private listenerController = new AbortController();

    constructor() {
        /* Re-render when secret visibility changes. */
        (document.getElementById("mostra-segreti") as HTMLInputElement).addEventListener("change", (e) => this.render(), { signal: this.listenerController.signal })
    }

    protected readDefinition(activeGameContext: GameViewContext<T> | null, staticGameDef: CompleteGameDefinition<T> | null): CompleteGameDefinition<T> {
        if (!!activeGameContext) {
            return activeGameContext.model.definition;
        } else if (!!staticGameDef) {
            return staticGameDef;
        } else {
            throw new Error("Unable to instantiate the game if no gameDef is provided, neither directly or in context");
        }
    }

    /**
     * Whether the timeline section should be rendered.
     *
     * Overridable by subclasses that need conditional timeline visibility.
     */
    shouldRenderTimeline(): boolean {
        return this.isDisplayingTimeline;
    }

    /**
     * Whether the current-state section should be rendered.
     *
     * By default this is true only for active-game mode.
     */
    shouldRenderCurrentState(): boolean {
        return !!this.activeGameContext;
    }

    /**
     * Read the admin secret-visibility toggle.
     *
     * @returns `true` when sensitive timeline/state data can be shown in clear.
     */
    canDisplaySecrets(): boolean {
        return (document.getElementById("mostra-segreti") as HTMLInputElement).checked;
    }

    /**
     * Enable or disable timeline rendering for this view.
     *
     * Enabling triggers an immediate render; disabling clears timeline DOM.
     * @param bool New timeline visibility flag.
     */
    setIsDisplayingTimeline(bool: boolean): void {
        this.isDisplayingTimeline = bool;
        if (bool) {
            this.render();
        } else {
            this.clearTimeline();
        }
    }

    /**
     * Render timeline and current state sections based on the active game context.
     * Called automatically when:
     * - `setIsDisplayingTimeline(true)` is invoked
     * - The secret visibility toggle changes
     * - `GameController.stateUpdated()` is called
     */
    render() {
        if (this.shouldRenderTimeline()) {
            const container = document.getElementById(this.timelineContainer);
            if (!container) return;
            this.renderTimeline(container);
        }
        if (this.shouldRenderCurrentState()) {
            const container = document.getElementById(this.currentStateContent);
            if (!container) return;
            this.renderCurrentState(container)
        }
    }

    /**
     * Render a step-by-step timeline for the current game.
     *
     * Steps are classified as "past", "current", or "future" based on the active step index.
     * Static string steps are always shown; function-based steps receive the secret-visibility
     * flag to allow conditional obfuscation.
     *
     * @param container - DOM element to populate with timeline HTML
     */
    renderTimeline(container: HTMLElement): void {
        const islive = !!this.activeGameContext;
        const curr = this.getCurrentStep() ?? Infinity;
        const s = this.canDisplaySecrets();
        const getState = (i: number) => (islive ? (i == curr ? "current" : (i < curr ? "past" : "future")) : null);
        const steps = this.getSteps().entries().map(([i, step]) => {
            if (typeof step == "string") {
                return { title: step, state: getState(i) };
            } else {
                /* Future steps stay obfuscated unless secrets are explicitly enabled. */
                return { title: step(!islive || i < curr || s), state: getState(i) }
            }
        }).toArray();

        const stepHtmlBuilder = (step: { title: string, state: string | null }) => `
        <article class="game-steps-list-item ${step.state == "current" ? "active" : ""}">${step.title}</article>
        `;

        container.innerHTML = `<article class="game-steps-list-item title">${this.gameDef.title}</article>` + steps.map(stepHtmlBuilder).join("\n")
    }

    /**
     * Render the current game state section (live progress, scores, prompts, etc.).
     * Called when the game is active.
     * Implementation should use `this.activeGameContext` to access model/controller state.
     * @param container - DOM element to populate
     */
    abstract renderCurrentState(container: HTMLElement): void;

    parseFieldsToAdminCurrentStateView(): string{
        const modelData = this.activeGameContext?.model as Record<string,unknown>|undefined;
        if(!modelData) return "";
        const lines: string[] = [];

        lines.push(`${String(modelData.title).toUpperCase()}`);

        const appendVisibleFields = (flavour: "definition" | "model") => {
            for (const [fieldKey, field] of Object.entries(this.fields)) {
                if (field.flavour !== flavour || !field.views) {
                    continue;
                }
                if (field.views.showin !== "admin" && field.views.showin !== "both") {
                    continue;
                }

                const value = modelData[fieldKey];
                const renderedValue = field.views.translate?.(value) ?? String(value);
                lines.push(`${field.views.descr ?? fieldKey}: ${renderedValue}`);
            }
        };

        appendVisibleFields("definition");
        appendVisibleFields("model");

        return lines.join("<br>")+"<br>";
    }

    /**
     * Return the list of timeline steps for this game.
     * Steps can be static strings or functions that conditionally obfuscate based on
     * secret visibility. Use functions when the step label contains sensitive info
     * (e.g., correct answers).
     * @returns Array where each element is either a string label or a function that
     *          receives a boolean secret-visibility flag and returns a label.
     */
    abstract getSteps(): (string | ((s: boolean) => string))[];

    /**
     * Return the current step index (0-based) in the game progression.
     * Used by `renderTimeline()` to mark steps as past/current/future.
     * @returns Step index, or null if the game is not active or not step-based.
     */
    abstract getCurrentStep(): number | null;

    /** Cache for the currently-active footer prompt element. */
    private _activeFooter: HTMLElement & { safeRemove: (result: boolean | null) => void } | null = null;
    removeFooterChoice(){
        this._activeFooter?.safeRemove(null);
    }

    /**
     * Render a footer with action buttons and invoke a callback when clicked.
     * Removes any previous footer before rendering the new one.
     * @param options - { advanceBtn: label for primary button, otherBtn?: label for secondary button }
     * @param listener - Callback invoked when a button is clicked. Receives true (advance),
     *                   false (other action), or null (cancelled).
     */
    renderFooterChoice(options: { advanceBtn: string, otherBtn?: string }, listener: (action: boolean | null) => void) {
        const container = document.getElementById(this.currentStateContainer);
        if (!!this._activeFooter) {
            this._activeFooter.safeRemove(null);
        }

        const element = toHtml(`
                <footer>
                    <div role="group">
                        ${!!options.otherBtn ? "<button class='game-admin-interaction-other contrast'>" + options.otherBtn + "</button>" : ""}
                        <button class="game-admin-interaction-advance active">${options.advanceBtn} <span class='material-symbols-outlined'>arrow_forward</span></button>
                    </div>
                </footer>
        `) as HTMLElement & { safeRemove: (result: boolean | null) => void };

        /* Attach cleanup method to invoke listener and clear cached reference. */
        element.safeRemove = (result: boolean | null) => {
            if (this._activeFooter !== element) return;
            element.remove();
            this._activeFooter = null;
            listener(result);
        };

        const advanceButton = element.querySelector(".game-admin-interaction-advance");
        advanceButton?.addEventListener("click", (event) => {
            event.stopPropagation();
            element.safeRemove(true);
        });

        if (!!options.otherBtn) {
            const otherButton = element.querySelector(".game-admin-interaction-other");
            otherButton?.addEventListener("click", (event) => {
                event.stopPropagation();
                element.safeRemove(false);
            });
        }

        this._activeFooter = element;
        container?.appendChild(element);
    }

    /**
     * Clear the timeline DOM content.
     * Called when hiding the timeline or during cleanup.
     */
    clearTimeline() {
        (document.getElementById(this.timelineContainer) as HTMLElement).innerHTML = "";
    }

    /**
     * Clear the current state DOM content and remove any active footer.
     * Called when hiding the current state or during cleanup.
     */
    clearCurrentState() {
        (document.getElementById(this.currentStateContent) as HTMLElement).innerHTML = "";
        if (!!this._activeFooter) this._activeFooter.safeRemove(null);
    }

    /**
     * Clear all game UI elements and unsubscribe from the secret visibility toggle.
     * Called by `GameController.clearAll()` during game shutdown.
     */
    clearViews() {
        this.listenerController.abort();
        if (this.shouldRenderCurrentState()) {
            this.clearCurrentState();
        }
        if (this.shouldRenderTimeline()) {
            this.clearTimeline();
        }
    }
}




export interface GameControllerContext {
    /** Returns the database adapter for reading/writing game state. */
    getDatabase(): IDatabaseAdapter;
}
/**
 * Coordinates a single game session between the model (state) and view (UI).
 *
 * ## Responsibilities
 *
 * - Own and manage the `GameModel` (persisted state) and `GameView` (UI rendering)
 * - Implement `GameViewContext` and `GameModelContext` for cross-access by model and view
 * - Synchronize state changes via `stateUpdated()` (save + re-render)
 * - Provide admin interaction prompts via `adminInteraction()`
 * - Clean up state and UI on game termination
 *
 * ## Usage Pattern
 *
 * Typically instantiated by `GameManager` at game start. The manager then:
 * 1. Calls `stateUpdated()` to initialize the timeline/state UI
 * 2. Orchestrates the game loop, calling controller methods that update the model
 * 3. Calls `adminInteraction()` to prompt the admin for manual decisions
 * 4. Calls `clearAll()` at the end to cleanup
 *
 */
export abstract class GameController<T extends AnyFieldsObject> implements GameViewContext<T>, GameModelContext {
    /** Context provided by the manager layer. */
    context: GameControllerContext;

    /** The persisted game state. Subclass must initialize. */
    abstract model: CompleteGameModel<T>;

    /** The game UI renderer. Subclass must initialize. */
    abstract view: GameView<T>;

    constructor(ctx: GameControllerContext) {
        this.context = ctx;
    }

    /**
     * Access the shared database adapter.
     *
     * Used by models to persist state and by question flow helpers.
     */
    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    /**
     * Persist the current game model and re-render the view.
     * Called by the game manager whenever the model state changes.
     * @param remote When true, skip persisting because the state came from a remote update.
     *               (Typically false; remote updates are handled by database listeners.)
     */
    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        this.view.render();
    }

    /**
     * Render a footer prompt and resolve once the admin makes a choice.
     * Blocks until the admin clicks advance or the alternate action.
     * @param options - { advanceBtn: primary button label, otherBtn?: alternate button label }
     * @returns true if advance button clicked, false if alternate button clicked.
    * @throws Rejects when the prompt is cancelled (for example during cleanup).
     */
    async adminInteraction(options: { advanceBtn: string, otherBtn?: string }): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.view.renderFooterChoice(options, (action) => {
                if (action !== null) {
                    resolve(action);
                } else {
                    reject();
                }
            })
        });
    }

    /**
     * Clear the current game UI and delete persisted state.
     * Called at game end to remove the timeline, current state, and database records.
     * Typically invoked via `GameManager.endGame()` → `GameController.clearAll()`.
     */
    clearAll() {
        this.view.clearViews();
        this.model.clearDatabase();
    }
}

/**
 * Context passed to `GameManager` constructor.
 * Provides database access, ranking updates, and player lookup.
 * Typically implemented by `QuizManager`.
 */
export interface GameManagerContext {
    /** Returns the database adapter for state persistence. */
    getDatabase(): IDatabaseAdapter;

    /**
     * Update the quiz ranking with score changes for participants.
     * @param diff - Map of participant ID → point delta. Used after question results.
     */
    updateRanking(diff: RankingDiff): void;

    /** Returns the current list of all participants. */
    getPeopleList(): Map<string, Person>;
}

/**
 * Game managers implement the runtime orchestration of a game session.
 *
 * ## Responsibilities
 *
 * - Own the game controller (which owns model and view)
 * - Implement the game loop in `startGame()` (ask questions, collect results, update rankings)
 * - Communicate with the app for ranking updates and player lookup
 * - Implement `GameControllerContext` and `QuestionContext` for question coordination
 * - Call `endGame()` to cleanup when the game is complete
 *
 * ## Usage Pattern
 *
 * The `QuizManager` instantiates a `GameManager` for each game:
 * 1. Creates manager instance passing `QuizManager` as context
 * 2. Calls `startGame()` which runs the game loop
 * 3. Manager creates/instantiates questions via `Question.ask(this, ...)`
 * 4. Manager calls `context.updateRanking(diff)` after results
 * 5. Manager calls `endGame()` at completion
 *
 */
export abstract class GameManager implements GameControllerContext, QuestionContext {
    /** Host-level services exposed by `QuizManager`. */
    context: GameManagerContext;

    resumeCheckpoints : ResumeCheckpoints;

    activeQuestion: Question|null = null;

    /** The game controller (owns model and view). Subclass must initialize. */
    abstract controller: GameController<AnyFieldsObject>;

    constructor(ctx: GameManagerContext, restoreState : boolean) {
        this.context = ctx;
        this.resumeCheckpoints = restoreState ? this.buildResumeCheckpoints() : new ResumeCheckpoints();
    }

    /**
     * Access the shared database adapter.
     *
     * Forwarded from `GameManagerContext` for controllers and questions.
     */
    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    /** Get the current participant list from the app context. */
    getPeopleList(): Map<string, Person> {
        return this.context.getPeopleList();
    }

    /**
     * Execute the game loop.
     * Must:
     * 1. Ask questions via `new Question(this, ...).ask()`
     * 2. Collect and evaluate results
     * 3. Call `this.context.updateRanking(diff)` after each round
     * 4. Return `true` when idle screen should show ranking, otherwise `false`
     */
    abstract startGame(): Promise<void>;

    async runGame(): Promise<boolean>{
        try {
            await this.startGame();
            return await this.endGame();
        } finally {
            try {
                this.controller.clearAll();
                this.activeQuestion?.clear();
            } catch (e){
                console.log("Error during game cleanup.")
                console.error(e);
            }
        }
    }

    /**
     * Finalize a game session with an admin choice and cleanup.
     *
     * Concrete managers typically call this at the end of `startGame()`.
     * The resolved boolean is propagated to `QuizManager` to decide whether
     * the idle quiz screen should show ranking.
     *
     * Side effects:
     * - Renders a footer prompt through the active game controller.
     * - Clears game UI and removes `/state/game` persisted data.
     *
     * @returns `true` if admin selected "Mostra classifica", otherwise `false`.
     */
    async endGame(): Promise<boolean> {
        const ret = await this.controller.adminInteraction({ advanceBtn: "Mostra classifica", otherBtn: "Passa a un altro gioco" });
        return ret;
    }

    abstract buildResumeCheckpoints(): ResumeCheckpoints
}


export abstract class GamePresenterStateView<T extends AnyFieldsObject> {
    abstract readonly fields: T;
    /** Immutable game definition used to render labels and static settings. */
    protected readonly gameDefinition: GameDefinitionDataFromFields<T>;

    /**
     * Create a presenter renderer bound to a parsed game definition payload.
     * @param gameDefinition Serializable definition metadata for the active game.
     */
    constructor(gameDefinition: GameDefinitionDataFromFields<T>) {
        this.gameDefinition = gameDefinition;
    }

    /**
     * Render the game-specific presenter section.
     *
     * Implementations should validate and decode `gameState` before reading any
     * game-specific fields, and use `showSecrets` to decide whether hidden data
     * (such as unrevealed answers) can be displayed in clear text.
     *
     * @param container Target element to fully update.
     * @param gameState Runtime snapshot read from `/state/game`.
     * @param showSecrets Whether sensitive values can be displayed in clear text.
     */
    abstract render(container: HTMLElement, gameState: Partial<GameDbDataFromFields<T>> | null, showSecrets: boolean): void;

    parseFieldsToPresenterCurrentStateView(gameState: Partial<GameDbDataFromFields<T>> | null): string{
        const definitionData = this.gameDefinition as Record<string, unknown>;
        const stateData = (gameState ?? {}) as Record<string, unknown>;
        const lines: string[] = [];

        lines.push(`${String(definitionData.title).toUpperCase()}`);

        const appendVisibleFields = (flavour: "definition" | "model") => {
            for (const [fieldKey, field] of Object.entries(this.fields)) {
                if (field.flavour !== flavour || !field.views) {
                    continue;
                }
                if (field.views.showin !== "presenter" && field.views.showin !== "both") {
                    continue;
                }

                const hasStateValue = stateData[fieldKey] !== undefined;
                const value = hasStateValue
                    ? stateData[fieldKey]
                    : flavour === "definition"
                        ? definitionData[fieldKey]
                        : "non trovato";
                const renderedValue = field.views.translate?.(value) ?? String(value);
                lines.push(`${field.views.descr ?? fieldKey}: ${renderedValue}`);
            }
        };

        appendVisibleFields("definition");
        appendVisibleFields("model");

        return lines.join("<br>") + "<br>";
    }
}