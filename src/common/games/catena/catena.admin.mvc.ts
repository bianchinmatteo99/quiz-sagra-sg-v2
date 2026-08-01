import { Secret, delay } from "../../general.utils";
import { CatenaGameRequiredData, CatenaGameStateSnapshot, CatenaState } from "./catena.contracts";
import { CatenaGameDefinition } from "./catena.admin.definition";
import {
    GameController,
    GameControllerContext,
    GameModel,
    GameModelContext,
    GameView,
    GameViewContext,
} from "../games.admin.base";

/**
 * Runtime state container for a Catena game session.
 *
 * Persists state under the shared game state path inherited from GameModel and
 * exposes helpers to read words in clear or secret-aware form for rendering.
 */
export class CatenaGameModel extends GameModel<CatenaGameStateSnapshot> {

    /** Immutable definition payload used to configure this session. */
    definition: CatenaGameDefinition;

    /** Index of the currently active chain word. */
    currentWordIndex: number;
    /** Number of letters revealed for the active word. */
    currentWordLetters: number;
    /** Visual transition delay used by the controller while revealing letters. */
    wordtransitiontime: number;
    /** Current game screen state. */
    state: CatenaState;

    /**
     * Create a Catena runtime model.
     *
     * @param ctx Model context providing persistence and update notifications.
     * @param def Parsed Catena game definition.
     * @param restoreState When true, starts best-effort state restoration from storage.
     */
    constructor(ctx: GameModelContext, def: CatenaGameDefinition) {
        super(ctx);
        this.definition = def;
        this.currentWordIndex = 0;
        this.currentWordLetters = def.data.words[0].length;
        this.wordtransitiontime = -1;
        this.state = CatenaState.STARTING;
    }

    /**
     * Return the word at the given index, or null when the index is out of bounds.
     * @param i Zero-based word index in the configured chain.
     * @returns The configured word at index i, or null when missing.
     */
    getWord(i: number): string|null {
        if(i in this.definition.data.words){
            return this.definition.data.words[i]
        } else {
            return null;
        }
    }
    /**
     * Wrap a word as a secret value so visibility respects the current reveal state.
     *
     * Past words are fully revealed, the active word shows only revealed letters,
     * and future words remain hidden.
     * @param i Zero-based word index in the chain.
     * @returns A secret-aware wrapper for the word, or null for invalid indexes.
     */
    getWordAsSecret(i: number): Secret<string>|null{
        const w = this.getWord(i);
        if(!w) return null;
        return new Secret(w, (clearValue)=> {
            if (this.currentWordIndex>i){
                return clearValue;
            } else if (i==this.currentWordIndex){
                return clearValue.slice(0, this.currentWordLetters) + (this.currentWordLetters==clearValue.length ? "" : "***");
            } else {
                return "***"
            }
        });
    }
    /**
     * Return the currently active word, or null when no word is selected.
     * @returns The active chain word for currentWordIndex.
     */
    getCurrentWord(): string|null {
        return this.getWord(this.currentWordIndex);
    }

    /**
     * Restore persisted Catena state from JSON.
     *
      * Only runtime fields are restored; definition data stays bound to the
      * constructor input.
      * @param data Partial snapshot loaded from persistent storage.
     * @returns `true` on success, `false` on decode error.
     */
    parseFromJSON(data: Partial<CatenaGameStateSnapshot>): boolean {
        this.state = data.state ?? CatenaState.STARTING;
        this.currentWordIndex = data.currentWordIndex ?? 0;
        this.currentWordLetters = data.currentWordLetters ?? this.definition.data.words[0].length;
        return true;
    }

    /**
     * Serialize the current game state into a Catena snapshot.
     *
     * The words array is emitted through secret-aware reads so unrevealed or
     * future words are masked according to current reveal progress.
     */
    toJSON(): CatenaGameStateSnapshot {
        return {
            ...CatenaGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            currentWordIndex: this.currentWordIndex,
            currentWordLetters: this.currentWordLetters,
            timeForAnswer: this.definition.data.timeForAnswer,
            canRetryForSameWord: this.definition.data.canRetryForSameWord,
            pointsForCorrectAnswer: this.definition.data.pointsForCorrectAnswer,
            words: this.definition.data.words.map((w, i) => this.getWordAsSecret(i)?.read() ?? "***"),
        };
    }
}

/**
 * View context for the Catena game.
 *
 * Extends the generic view context with access to the Catena model.
 */
export interface CatenaGameViewContext extends GameViewContext {
    /** Live Catena model used by the active view. */
    model: CatenaGameModel;
}

/**
 * Catena-specific view implementation.
 *
 * Renders the live progress of the chain and builds the timeline for
 * static or active display modes.
 */
export class CatenaGameView extends GameView {

    /** Active controller-backed context; null when rendering static timeline mode. */
    activeGameContext: CatenaGameViewContext | null;
    /** Definition used to render timeline labels and state metadata. */
    gameDef: CatenaGameDefinition
    /**
     * Create a Catena view for an active controller or static timeline.
     *
     * If a context is provided, the definition is derived from the model.
     * @param ctx Active view context from a running controller.
     * @param gameDef Definition for static timeline rendering when no context exists.
     * @throws Error When neither ctx nor gameDef is provided.
     */
    constructor(ctx: CatenaGameViewContext | null = null, gameDef: CatenaGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        if (!!ctx) {
            this.gameDef = ctx.model.definition;
        } else if (!!gameDef) {
            this.gameDef = gameDef;
        } else {
            throw new Error("Unable to instantiate the game if no gameDef is provided, neither directly or in context")
        }
    }

    /**
     * Build the Catena timeline steps used by the game preview and progress.
        *
        * Word steps are provided as secret-aware label factories so the base view
        * can decide whether to reveal or mask content.
        * @returns Ordered timeline entries from cover to conclusion.
     */
    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.data.words.map(word => ((s:boolean)=>`Parola: ${s ? word : "***"}`)),
            "Conclusione"]
    }
    /**
     * Compute the currently active timeline step for an active game.
        *
        * Step mapping:
        * - 0 for cover display
        * - currentWordIndex + 1 for chain progression
        * @returns Timeline index, or null when no active context is attached.
     */
    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        if(this.activeGameContext.model.state==CatenaState.DISPLAYCOVER){
            return 0
        } else {
            return this.activeGameContext.model.currentWordIndex + 1;
        }
    }

    /**
     * Render the current Catena game state into the provided container.
     *
     * This updates the container markup with current progress, points, timer,
     * and retry-exclusion info. Sensitive values are masked when secret display
     * is disabled.
     * @param container Target element that receives the rendered state markup.
     */
    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const s = this.canDisplaySecrets();
        const currentWord = this.activeGameContext.model.getCurrentWord();
        const currentWordLength = currentWord ? String(currentWord.length) : "?";
        const displayedWordLength = s ? currentWordLength : "***";
        const displayedCurrentWord = this.activeGameContext.model
            .getWordAsSecret(this.activeGameContext.model.currentWordIndex)
            ?.read(s)
            ?.toUpperCase() ?? "?";
        container.innerHTML = `
            Titolo: ${this.activeGameContext.model.definition.data.title}<br/>
            Parola in corso: ${this.activeGameContext.model.currentWordIndex + 1} di ${this.gameDef.data.words.length}<br/>
            Lettere ${this.activeGameContext.model.currentWordLetters} di ${displayedWordLength}<br/>
            Parola corretta: ${displayedCurrentWord}
            <br/>
            Punti per risposta: ${this.gameDef.data.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.gameDef.data.timeForAnswer}
        `;
    }

}

/**
 * Controller for the Catena game.
 *
 * Coordinates word progression, letter reveal transitions, admin interactions,
 * and live state updates for the active Catena game session.
 */
export class CatenaGameController extends GameController implements CatenaGameViewContext {
    model: CatenaGameModel;
    view: CatenaGameView;

    /**
     * Create a Catena controller with its model and view.
     *
     * @param ctx Controller context provided by the game manager.
     * @param def Parsed Catena definition for this run.
     * @param restoreState When true, model restoration is attempted from storage.
     */
    constructor(ctx: GameControllerContext, def: CatenaGameDefinition){
        super(ctx);
        this.model = new CatenaGameModel(this, def);
        this.view = new CatenaGameView(this);
    }

    /**
     * Advance to the next word in the chain.
     *
     * Resets the letter reveal count for the newly active word.
        * Persists and re-renders through stateUpdated when successful.
        * @returns `true` when another word exists, otherwise `false`.
     */
    nextWord() : boolean{
        const next = this.model.currentWordIndex+1;
        const nextw = this.model.getWord(next);
        if(!!nextw) {
            this.model.currentWordIndex = next;
            this.model.currentWordLetters = 0;
            this.stateUpdated();
            return true;
        } else {
            return false;
        }
    }

    /**
     * Reveal the next letter of the current word and optionally wait for a transition.
     *
     * The game remains on the current word.
     * @param transitionT Delay in milliseconds after each state update.
        * @returns `true` when more letters remain to be revealed after this call.
     */
    async nextLetter(transitionT: number = 0): Promise<boolean>{
        this.model.wordtransitiontime = transitionT;
        const w = this.model.getCurrentWord()!;
        if(this.model.currentWordLetters < w.length){
            this.model.currentWordLetters+=1;
            this.stateUpdated();
            await delay(transitionT);
        }
        return this.model.currentWordLetters < w.length;
    }

    /**
     * Mark the current word as fully revealed and optionally wait for a transition.
     *
     * Used when the answer is correct or the round is advanced manually.
        * @param transitionT Delay in milliseconds applied after persisting state.
     */
    async completeWord(transitionT : number = 0): Promise<void>{
        this.model.wordtransitiontime = transitionT;
        const w = this.model.getCurrentWord()!;
        this.model.currentWordLetters = w.length;
        this.stateUpdated();
        await delay(transitionT);
    }

    /**
     * Set and persist the current Catena screen state.
     *
     * Triggers stateUpdated, which saves model data and refreshes the view.
     * @param s New game state.
     */
    setState(s:CatenaState){
        this.model.state = s;
        this.stateUpdated();
    }
}
