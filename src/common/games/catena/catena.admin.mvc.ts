import { Secret, delay } from "../../general.utils";
import { CatenaGameStateSnapshot, CatenaState } from "./catena.contracts";
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
 * Tracks the active word index, how many letters are revealed, the current deny
 * list for retries, and the basic screen state.
 */
export class CatenaGameModel extends GameModel {

    definition: CatenaGameDefinition;

    /** Index of the currently active chain word. */
    currentWordIndex: number;
    /** Number of letters revealed for the active word. */
    currentWordLetters: number;
    /** Visual transition delay used by the controller while revealing letters. */
    wordtransitiontime: number;
    /** Players excluded from retrying the current word when retries are disabled. */
    currentDenyList: string[] = [];
    /** Current game screen state. */
    state: CatenaState;

    constructor(ctx: GameModelContext, def: CatenaGameDefinition, restoreState: boolean = false) {
        super(ctx);
        this.definition = def;
        this.currentWordIndex = 0;
        this.currentWordLetters = def.data.words[0].length;
        this.wordtransitiontime = -1;
        this.state = CatenaState.STARTING;

        if (restoreState) {
            this.loadFromDatabase();
        }
    }

    /**
     * Return the word at the given index, or null when the index is out of bounds.
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
     */
    getCurrentWord(): string|null {
        return this.getWord(this.currentWordIndex);
    }

    /**
     * Restore persisted Catena state from JSON.
     *
     * Only the current word index is restored here for resume support.
     * @returns `true` on success, `false` on parse error.
     */
    parseFromJSON(data: any): boolean {
        // Parse quiz definition from JSON data
        try {
            this.currentWordIndex = data.currentWordIndex ?? 0;
            this.currentWordLetters = data.currentWordLetters ?? 0;
            return true;
        } catch (error) {
            console.error("Error parsing game from JSON:", error);
            return false;
        }
    }

    toJSON(): CatenaGameStateSnapshot {
        return {
            kind: this.definition.kind,
            name: this.definition.data.name,
            ...(this.definition.data.title !== undefined ? { title: this.definition.data.title } : {}),
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
    model: CatenaGameModel;
}

/**
 * Catena-specific view implementation.
 *
 * Renders the live progress of the chain and builds the timeline for
 * static or active display modes.
 */
export class CatenaGameView extends GameView {

    activeGameContext: CatenaGameViewContext | null;
    gameDef: CatenaGameDefinition
    /**
     * Create a Catena view for an active controller or static timeline.
     *
     * If a context is provided, the definition is derived from the model.
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
     */
    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.data.words.map(word => ((s:boolean)=>`Parola: ${s ? word : "***"}`)),
            "Conclusione"]
    }
    /**
     * Compute the currently active timeline step for an active game.
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
            Parola in corso: ${this.activeGameContext.model.currentWordIndex + 1} di ${this.gameDef.data.words.length}<br/>
            Lettere ${this.activeGameContext.model.currentWordLetters} di ${displayedWordLength}<br/>
            Parola corretta: ${displayedCurrentWord}
            ${this.gameDef.data.canRetryForSameWord ? "" : ("<br/>Persone escluse: " + this.activeGameContext.model.currentDenyList.length)}<br/>
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

    constructor(ctx: GameControllerContext, def: CatenaGameDefinition, restoreState: boolean = false){
        super(ctx);
        this.model = new CatenaGameModel(this, def, restoreState);
        this.view = new CatenaGameView(this);
        this.stateUpdated();
    }

    /**
     * Advance to the next word in the chain.
     *
     * Resets the letter reveal count for the newly active word.
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
     * @returns `true` when more letters remain to be revealed.
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
     * @param s New game state.
     */
    setState(s:CatenaState){
        this.model.state = s;
        this.stateUpdated();
    }
}
