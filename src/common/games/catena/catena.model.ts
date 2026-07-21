import { Secret } from "../../general.utils";
import { GameModel, GameModelContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";

/**
 * States used by the Catena game to control screen flow.
 */
export enum CatenaState {
    STARTING,
    DISPLAYCOVER,
    DISPLAYCHAIN,
    ASKINGQUESTION,
    ENDING
}

/**
 * Runtime state container for a Catena game session.
 *
 * Tracks the active word index, how many letters are revealed, the current deny
 * list for retries, and the basic screen state.
 */
export class ReazioneCatenaGameModel extends GameModel {

    definition: ReazioneCatenaGameDefinition;

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

    constructor(ctx: GameModelContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false) {
        super(ctx);
        this.definition = def;
        this.currentWordIndex = 0;
        this.currentWordLetters = def.words[0].length;
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
        if(i in this.definition.words){
            return this.definition.words[i]
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
            console.error('Error parsing game from JSON:', error);
            return false;
        }
    }
    /**
     * Serialize the minimal runtime state required to resume the Catena game.
     */
    toJSON() {
        return {
            name: this.definition.name,
            state: this.state,
            currentWordIndex: this.currentWordIndex,
            currentWordLetters: this.currentWordLetters,
            words: this.definition.words.map((w,i)=>this.getWordAsSecret(i)?.read())
        };
    }
}