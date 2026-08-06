import { toHtml } from "../../general.utils";
import { FieldSchema } from "./base.admin.contracts";
import { CompleteGameDefinition } from "./base.admin.definition";
import { CompleteGameModel } from "./base.admin.model";

/** Active-game view context exposing the concrete game model. */
export interface GameViewContext<T extends FieldSchema> {
    model: CompleteGameModel<T>;
}

/**
 * Base admin-side renderer for field-based game implementations.
 *
 * Supports both active mode (live controller/model attached) and static mode
 * (definition-only rendering for previews).
 */
export abstract class GameView<T extends FieldSchema> {
    abstract fields: T;

    /** Timeline root element id. */
    readonly timelineContainer = "game-timeline";
    /** Current-state wrapper element id. */
    readonly currentStateContainer = "game-current-state";
    /** Current-state content element id. */
    readonly currentStateContent = "game-current-state-content";
    /** Whether timeline rendering is enabled for this instance. */
    isDisplayingTimeline = false;

    /** Active controller/model context, or null when rendering static previews. */
    abstract activeGameContext: GameViewContext<T> | null;
    /** Definition used for labels and static metadata. */
    abstract gameDef: CompleteGameDefinition<T>;

    private listenerController = new AbortController();

    constructor() {
        (document.getElementById("mostra-segreti") as HTMLInputElement)?.addEventListener("change", () => this.render(), { signal: this.listenerController.signal });
    }

    /** Resolve the definition from active context or provided static value. */
    protected readDefinition(activeGameContext: GameViewContext<T> | null, staticGameDef: CompleteGameDefinition<T> | null): CompleteGameDefinition<T> {
        if (activeGameContext) return activeGameContext.model.definition;
        if (staticGameDef) return staticGameDef;
        throw new Error("Unable to instantiate the game if no gameDef is provided, neither directly or in context");
    }

    /** Whether the timeline section should be rendered. */
    shouldRenderTimeline(): boolean { return this.isDisplayingTimeline; }
    /** Whether the current-state section should be rendered. */
    shouldRenderCurrentState(): boolean { return !!this.activeGameContext; }
    /** Read the admin secrets-toggle state. */
    canDisplaySecrets(): boolean { return (document.getElementById("mostra-segreti") as HTMLInputElement).checked; }

    /** Enable or disable timeline rendering. */
    setIsDisplayingTimeline(bool: boolean): void {
        this.isDisplayingTimeline = bool;
        if (bool) this.render(); else this.clearTimeline();
    }

    /** Re-render timeline and current state according to active mode and visibility flags. */
    render() {
        if (this.shouldRenderTimeline()) {
            const container = document.getElementById(this.timelineContainer);
            if (!container) return;
            this.renderTimeline(container);
        }
        if (this.shouldRenderCurrentState()) {
            const container = document.getElementById(this.currentStateContent);
            if (!container) return;
            this.renderCurrentState(container);
        }
    }

    /** Render timeline entries with current/past/future state classification. */
    renderTimeline(container: HTMLElement): void {
        const islive = !!this.activeGameContext;
        const curr = this.getCurrentStep() ?? Infinity;
        const s = this.canDisplaySecrets();
        const getState = (i: number) => (islive ? (i == curr ? "current" : (i < curr ? "past" : "future")) : null);
        const steps = this.getSteps().entries().map(([i, step]) => typeof step == "string"
            ? { title: step, state: getState(i) }
            : { title: step(!islive || i < curr || s), state: getState(i) }).toArray();

        const stepHtmlBuilder = (step: { title: string, state: string | null }) => `<article class="game-steps-list-item ${step.state == "current" ? "active" : ""}">${step.title}</article>`;
        container.innerHTML = `<article class="game-steps-list-item title">${this.gameDef.title}</article>` + steps.map(stepHtmlBuilder).join("\n");
    }

    /** Render the game-specific current state section. */
    abstract renderCurrentState(container: HTMLElement): void;

    /** Build a generic admin-side HTML summary from fields exposing admin/both visibility. */
    parseFieldsToAdminCurrentStateView(): string {
        const modelData = this.activeGameContext?.model as Record<string, unknown> | undefined;
        if (!modelData) return "";
        const lines: string[] = [];
        lines.push(`${String(modelData.title).toUpperCase()}`);

        const appendVisibleFields = (flavour: "definition" | "model") => {
            for (const [fieldKey, field] of Object.entries(this.fields)) {
                if (field.flavour !== flavour || !field.views) continue;
                if (field.views.showin !== "admin" && field.views.showin !== "both") continue;
                const value = modelData[fieldKey];
                const renderedValue = field.views.translate?.(value) ?? String(value);
                lines.push(`${field.views.descr ?? fieldKey}: ${renderedValue}`);
            }
        };

        appendVisibleFields("definition");
        appendVisibleFields("model");
        return lines.join("<br>") + "<br>";
    }

    abstract getSteps(): (string | ((s: boolean) => string))[];
    abstract getCurrentStep(): number | null;

    private _activeFooter: HTMLElement & { safeRemove: (result: boolean | null) => void } | null = null;

    /** Remove the currently rendered admin footer action prompt, if present. */
    removeFooterChoice() { this._activeFooter?.safeRemove(null); }

    /**
     * Render an action footer and notify caller when a choice is made.
     *
     * Any previous footer instance is removed before attaching the new one.
     */
    renderFooterChoice(options: { advanceBtn: string, otherBtn?: string }, listener: (action: boolean | null) => void) {
        const container = document.getElementById(this.currentStateContainer);
        if (this._activeFooter) this._activeFooter.safeRemove(null);

        const element = toHtml(`
                <footer>
                    <div role="group">
                        ${options.otherBtn ? "<button class='game-admin-interaction-other contrast'>" + options.otherBtn + "</button>" : ""}
                        <button class="game-admin-interaction-advance active">${options.advanceBtn} <span class='material-symbols-outlined'>arrow_forward</span></button>
                    </div>
                </footer>
        `) as HTMLElement & { safeRemove: (result: boolean | null) => void };

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

        if (options.otherBtn) {
            const otherButton = element.querySelector(".game-admin-interaction-other");
            otherButton?.addEventListener("click", (event) => {
                event.stopPropagation();
                element.safeRemove(false);
            });
        }

        this._activeFooter = element;
        container?.appendChild(element);
    }

    /** Clear timeline DOM content. */
    clearTimeline() { (document.getElementById(this.timelineContainer) as HTMLElement).innerHTML = ""; }
    /** Clear current-state DOM content and active footer prompt. */
    clearCurrentState() { (document.getElementById(this.currentStateContent) as HTMLElement).innerHTML = ""; if (this._activeFooter) this._activeFooter.safeRemove(null); }
    /** Dispose listeners and clear rendered sections according to active visibility flags. */
    clearViews() { this.listenerController.abort(); if (this.shouldRenderCurrentState()) this.clearCurrentState(); if (this.shouldRenderTimeline()) this.clearTimeline(); }
}