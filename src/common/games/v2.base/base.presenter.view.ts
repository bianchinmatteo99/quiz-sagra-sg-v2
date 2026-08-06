import { FieldSchema, GameDbDataFromFields, GameDefinitionDataFromFields } from "./base.admin.contracts";

/**
 * Base presenter-side renderer for field-based games.
 *
 * Presenter views consume immutable game definition data plus optional runtime
 * game state from /state/game to render operator-facing summaries.
 */
export abstract class GamePresenterStateView<T extends FieldSchema> {
    /** Field schema associated with this presenter implementation. */
    abstract readonly fields: T;
    /** Parsed game definition payload used as fallback/static metadata source. */
    protected readonly gameDefinition: GameDefinitionDataFromFields<T>;

    constructor(gameDefinition: GameDefinitionDataFromFields<T>) {
        this.gameDefinition = gameDefinition;
    }

    /** Render the presenter panel for the game. */
    abstract render(container: HTMLElement, gameState: Partial<GameDbDataFromFields<T>> | null, showSecrets: boolean): void;

    /**
     * Build a generic presenter-side HTML summary for fields configured with
     * presenter or shared visibility.
     */
    parseFieldsToPresenterCurrentStateView(gameState: Partial<GameDbDataFromFields<T>> | null): string {
        const definitionData = this.gameDefinition as Record<string, unknown>;
        const stateData = (gameState ?? {}) as Record<string, unknown>;
        const lines: string[] = [];

        lines.push(`${String(definitionData.title).toUpperCase()}`);

        const appendVisibleFields = (flavour: "definition" | "model") => {
            for (const [fieldKey, field] of Object.entries(this.fields)) {
                if (field.flavour !== flavour || !field.views) continue;
                if (field.views.showin !== "presenter" && field.views.showin !== "both") continue;

                const hasStateValue = stateData[fieldKey] !== undefined;
                const value = hasStateValue ? stateData[fieldKey] : flavour === "definition" ? definitionData[fieldKey] : "non trovato";
                const renderedValue = field.views.translate?.(value) ?? String(value);
                lines.push(`${field.views.descr ?? fieldKey}: ${renderedValue}`);
            }
        };

        appendVisibleFields("definition");
        appendVisibleFields("model");
        return lines.join("<br>") + "<br>";
    }
}