/**
 * Shared game infrastructure used by all concrete game implementations.
 *
 * This module defines the contract for:
 * - game metadata and serialization (`GameDefinition`)
 * - persisted game state (`GameModel`)
 * - UI rendering and user flow helpers (`GameView`)
 * - controller/manager orchestration and cross-cutting services.
 *
 * ## Intended Usage
 *
 * Games follow a strict layering pattern:
 *
 * 1. **GameDefinition** — Immutable game metadata (rules, point values, questions, etc.)
 *    parsed once from the quiz definition. Used by builder to create instances from MD/JSON.
 *
 * 2. **GameModel** — Extends `BaseModel` to persist runtime state to `/state/game`.
 *    Defines the active `GameDefinition` and any session-specific fields (current word,
 *    progress counters, etc.). Requires `GameModelContext` (which extends `BaseModelContext`).
 *
 * 3. **GameController** — Owns a `GameModel` and `GameView`. Coordinates state updates
 *    via `stateUpdated()` which triggers database persistence and UI re-render.
 *    Provides `adminInteraction()` for host-driven flow control.
 *    Implements both `GameViewContext` and `GameModelContext` to provide cross-access.
 *    Requires `GameControllerContext` (provides getDatabase).
 *
 * 4. **GameView** — Dual-mode UI renderer. See separate section below for two usage patterns.
 *    Observes secret visibility changes and re-renders accordingly.
 *
 * 5. **GameManager** — Owns the controller and implements `GameManagerContext`.
 *    Runs `startGame()` which orchestrates the game loop, calls questions,
 *    collects results, and updates rankings via `context.updateRanking()`.
 *    Implements `GameControllerContext` so it can be passed to `GameController`.
 *
 * ## Context Chain & Contracts
 *
 * The context interfaces form a chain of dependencies:
 *
 * ```
 * QuizManager (implements GameManagerContext)
 *   ↓ creates
 * GameManager (implements GameControllerContext + QuestionContext)
 *   ↓ creates
 * GameController (implements GameViewContext + GameModelContext)
 *   ├─ creates GameModel (uses GameModelContext)
 *   └─ creates GameView (uses GameViewContext)
 * ```
 *
 * Context contracts:
 * - `GameManagerContext`: getDatabase(), updateRanking(), getPeopleList() → implemented by QuizManager
 * - `GameControllerContext`: getDatabase() → implemented by GameManager
 * - `GameModelContext` (extends BaseModelContext): getDatabase(), stateUpdated() → implemented by GameController
 * - `GameViewContext`: marker interface → implemented by GameController, extended per-game
 *
 * ## Data Flow (Active Game)
 *
 * - Admin invokes `QuizManager.startGame()` → instantiates `GameManager` via `games.register`.
 * - `GameManager.startGame()` runs game loop (ask questions, collect answers, update rankings).
 * - State changes via `GameController.stateUpdated(remote)` → saves to DB → `GameView.render()` re-paints.
 * - Timeline and current state DOM update when secrets toggle or controller state changes.
 * - On completion, `GameManager.endGame()` → `GameController.clearAll()` removes UI and state.
 *
 */

import { IDatabaseAdapter } from "../database/database.types";
import { BaseModel, BaseModelContext, toHtml } from "../general.utils";
import { Person } from "../people/people.model";
import { QuestionContext } from "../questions/question.base";
import { RankingDiff } from "../people/people.controller";

export abstract class GameDefinition {
    /**
     * Logical identifier used by builders and registration lookup.
     * Must match the key registered in `games.register.ts`.
     */
    abstract readonly name: string;

    /**
     * Human-visible title shown in the quiz UI.
     * Rendered in game selection and results displays.
     */
    abstract readonly displayName: string;

    /**
     * Serialize the definition to JSON for storage or transmission.
     * Must preserve all immutable game rules and configuration.
     */
    abstract toJSON(): any;

    /** Unique index within the quiz's games list. */
    readonly id: number;
    
    constructor(id: number) {
        this.id = id;
    }
}

/**
 * Builder interface used to instantiate a concrete game definition from
 * Markdown or persisted JSON.
 *
 * Implementations are registered in `games.register.ts` and invoked during
 * quiz initialization to parse game rules from `public/quiz_def.md` or restore
 * from `/definition/games` in the database.
 */
export interface GameDefinitionBuilder<T extends GameDefinition> {
    /**
     * Parse a game definition from Markdown section text.
     * @param id - Game index within the quiz's games array
     * @param md - Markdown content for this game (e.g., rules, word list, point values)
     * @returns Parsed definition instance
     */
    parseFromMD(id: number, md: string): T;
    
    /**
     * Parse a game definition from persisted JSON (e.g., from database).
     * @param id - Game index within the quiz's games array
     * @param data - Serialized definition object from `definition.toJSON()`
     * @returns Parsed definition instance
     */
    parseFromJSON(id: number, data: any): T;
}

/**
 * Context passed to `GameModel` constructor.
 * Provides database access and state change notifications.
 * Inherits `getDatabase()` and `stateUpdated(remote)` from `BaseModelContext`.
 */
export interface GameModelContext extends BaseModelContext {

}

/**
 * Base class for persisted game state.
 *
 * Game models are responsible for storing runtime state under a shared path
 * and recovering it across page refreshes or app restarts.
 *
 * ## Expected Implementation
 *
 * Concrete subclasses must:
 * 1. Define `definition: GameDefinition` (immutable game rules).
 * 2. Add fields for all mutable game state (current word index, score, etc.).
 * 3. Implement `parseFromJSON(data)` to restore state from database.
 * 4. Implement `toJSON()` to serialize state for persistence.
 * 5. Optional: call `setSecret()` to register secrets (e.g., hidden answers) that should
 *    be available only to the admin or obfuscated based on game logic.
 *
 * ## Context Requirements
 *
 * The model expects a `GameModelContext` which extends `BaseModelContext`. This provides:
 * - `getDatabase()` — for loading/saving state
 * - `stateUpdated(remote)` — called to signal state changes (triggers view re-render)
 *
 * Typically, the `GameController` implements this interface and passes itself to the model.
 *
 * State is automatically saved to `/state/game` whenever the controller calls
 * `stateUpdated()`. Secrets are persisted under `/secrets/game/{key}`.
 *
 */
export abstract class GameModel extends BaseModel {
    /** Database path where game state is persisted. */
    readonly DBPATH = "/state/game";
    
    /** Database path prefix for storing secrets (admin-only or obfuscated values). */
    protected readonly SECRETSPATH = "/game";
    
    /** The immutable game definition containing rules and configuration. */
    abstract definition: GameDefinition;

    context: GameModelContext;

    constructor(ctx: GameModelContext) {
        super();
        this.context = ctx;
    }

}

/**
 * Context passed to `GameView` constructor.
 *
 * This is a marker interface that concrete game implementations extend to provide
 * access to game-specific model or view state. It allows GameView subclasses to type
 * their `activeGameContext` property more precisely.
 *
 * Example: `CatenaGameViewContext extends GameViewContext { model: ReazioneCatenaGameModel }`
 * allows the view to access Catena-specific model methods and fields.
 */
export interface GameViewContext {

}

/**
 * Base class for rendering game UI and optional secret-aware timelines.
 *
 * ## Dual Mode: Static Timeline vs Active Game Display
 *
 * GameView supports two distinct usage patterns:
 *
 * **Mode 1: Static Timeline Display** (game is inactive)
 * - `activeGameContext` is null
 * - `gameDef` is set directly (no controller context)
 * - Timeline can be displayed by calling `setIsDisplayingTimeline(true)`
 * - Steps and labels are static/pre-rendered (no live data)
 * - Used by quiz UI to preview game progression before/after play
 * - View is independent, not owned by controller
 *
 * **Mode 2: Active Game Display** (game is running)
 * - `activeGameContext` is set to the `GameController`
 * - `gameDef` comes from the controller's model
 * - `shouldRenderCurrentState()` returns true; renders live game state
 * - Timeline can optionally be displayed alongside current state
 * - `render()` is called automatically when state changes or secrets toggle
 * - View is owned and managed by controller
 *
 * ## Responsibilities
 *
 * - Render a **timeline** (step-by-step progression) with optional secret obfuscation
 * - Render a **current state** section showing live game information (when active)
 * - Manage **footer prompts** for admin interaction (advance/skip/retry buttons)
 * - Observe **secret visibility toggle** and re-render when it changes
 *
 * ## Expected Implementation
 *
 * Concrete subclasses must:
 * 1. Support both usage modes in the constructor (context-based and definition-based)
 * 2. Implement `renderCurrentState(container)` — render live game info when active.
 * 3. Implement `getSteps()` — return step labels (static strings or secret-aware functions).
 * 4. Implement `getCurrentStep()` — return current step index (null when inactive).
 *
 * ## Timeline and Secret Handling
 *
 * The timeline displays game progression, with steps that can be static or dynamic.
 * Dynamic steps are functions `(s: boolean) => string` where `s` is the secret-visibility
 * flag from the "mostra-segreti" checkbox. Use this to hide/show sensitive info like
 * correct answers on the timeline.
 *
 */
export abstract class GameView {
    /** DOM id for the timeline container (step-by-step progression display). */
    readonly timelineContainer = "game-timeline";
    
    /** DOM id for the game current-state wrapper. */
    readonly currentStateContainer = "game-current-state";
    
    /** DOM id for the game current-state content (inner). */
    readonly currentStateContent = "game-current-state-content";
    
    /** Whether the timeline is currently being rendered. */
    isDisplayingTimeline: boolean = false;
    
    /** The active game context (usually the controller). Null if game is not running. */
    abstract activeGameContext: GameViewContext | null;
    
    /** The immutable game definition for rendering rules and metadata. */
    abstract gameDef: GameDefinition;

    private listenerController = new AbortController();
    
    constructor(){
        /* Re-render the game view when the secret visibility checkbox changes. */
        (document.getElementById("mostra-segreti") as HTMLInputElement).addEventListener("change", (e) => this.render(), { signal: this.listenerController.signal })
    }

    shouldRenderTimeline(): boolean {
        return this.isDisplayingTimeline;
    }
    shouldRenderCurrentState(): boolean {
        return !!this.activeGameContext;
    }
    canDisplaySecrets(): boolean{
        return (document.getElementById("mostra-segreti") as HTMLInputElement).checked;
    }
    setIsDisplayingTimeline(bool: boolean): void {
        this.isDisplayingTimeline = bool;
        if(bool){
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
        const getState = (i:number) => (islive ? (i == curr ? "current" : (i < curr ? "past" : "future")) : null);
        const steps = this.getSteps().entries().map(([i,step])=>{
            if(typeof step == "string"){
                return {title: step, state: getState(i)};
            } else {
                /* Invoke function step with secret visibility; only show obfuscated content for future steps. */
                return {title: step(!islive || i<curr || s), state: getState(i)}
            }
        }).toArray();

        const stepHtmlBuilder = (step: {title: string, state: string|null}) => `
        <article class="game-steps-list-item ${step.state == "current" ? "active" : ""}">${step.title}</article>
        `;

        container.innerHTML = steps.map(stepHtmlBuilder).join("\n")
    }

    /**
     * Render the current game state section (live progress, scores, prompts, etc.).
     * Called when the game is active.
     * Implementation should use `this.activeGameContext` to access model/controller state.
     * @param container - DOM element to populate
     */
    abstract renderCurrentState(container: HTMLElement): void;
    
    /**
     * Return the list of timeline steps for this game.
     * Steps can be static strings or functions that conditionally obfuscate based on
     * secret visibility. Use functions when the step label contains sensitive info
     * (e.g., correct answers).
     * @returns Array where each element is either a string label or a function that
     *          receives a boolean secret-visibility flag and returns a label.
     */
    abstract getSteps(): (string | ((s:boolean)=>string))[]; 
    
    /**
     * Return the current step index (0-based) in the game progression.
     * Used by `renderTimeline()` to mark steps as past/current/future.
     * @returns Step index, or null if the game is not active or not step-based.
     */
    abstract getCurrentStep(): number|null;

    /** Cache for the currently-active footer prompt element. */
    private _activeFooter: HTMLElement & { safeRemove: (result: boolean | null) => void } | null = null;
    
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
                        ${!!options.otherBtn ? "<button class='game-admin-interaction-other contrast'>"+options.otherBtn+"</button>" : ""}
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
    clearTimeline(){
        (document.getElementById(this.timelineContainer) as HTMLElement).innerHTML = "";
    }
    
    /**
     * Clear the current state DOM content and remove any active footer.
     * Called when hiding the current state or during cleanup.
     */
    clearCurrentState(){
        (document.getElementById(this.currentStateContent)as HTMLElement).innerHTML = "";
        if(!!this._activeFooter) this._activeFooter.safeRemove(null);
    }
    
    /**
     * Clear all game UI elements and unsubscribe from the secret visibility toggle.
     * Called by `GameController.clearAll()` during game shutdown.
     */
    clearViews(){
        this.listenerController.abort();
        if(this.shouldRenderCurrentState()){
            this.clearCurrentState();
        }
        if(this.shouldRenderTimeline()){
            this.clearTimeline();
        }
    }
}

/**
 * Context passed to `GameController` constructor.
 * Provides database access for model persistence.
 * Typically implemented by `GameManager`.
 */
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
export abstract class GameController implements GameViewContext, GameModelContext {
    context: GameControllerContext;
    
    /** The persisted game state. Subclass must initialize. */
    abstract model: GameModel;
    
    /** The game UI renderer. Subclass must initialize. */
    abstract view: GameView;
    
    constructor(ctx: GameControllerContext) {
        this.context = ctx;
    }

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
     * @throws Rejects if cancelled (e.g., via footer cleanup).
     */
    async adminInteraction(options: {advanceBtn: string, otherBtn?: string}): Promise<boolean>{
        return new Promise((resolve, reject)=>{
            this.view.renderFooterChoice(options, (action)=>{
                if(action!==null){
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
    clearAll(){
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
    context: GameManagerContext;

    /** The game controller (owns model and view). Subclass must initialize. */
    abstract controller: GameController;

    constructor(ctx: GameManagerContext) {
        this.context = ctx;
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }
    
    /** Get the current participant list from the app context. */
    getPeopleList(): Map<string, Person>{
        return this.context.getPeopleList();
    }

    /**
     * Execute the game loop.
     * Must:
     * 1. Ask questions via `new Question(this, ...).ask()`
     * 2. Collect and evaluate results
     * 3. Call `this.context.updateRanking(diff)` after each round
     * 4. Return when the game is complete
     *
     * The manager should not call `endGame()` explicitly; `QuizManager` will do this.
     */
    abstract startGame(): Promise<void>;

    /**
     * Clear the game UI and persisted state.
     * Called by `QuizManager` after `startGame()` completes.
     * Invokes `GameController.clearAll()` to cleanup.
     */
    endGame(){
        this.controller.clearAll();
    }
}