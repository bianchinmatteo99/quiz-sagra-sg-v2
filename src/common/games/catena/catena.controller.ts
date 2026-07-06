import { delay, Secret } from "../../general.utils";
import { GameController, GameControllerContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { CatenaState, ReazioneCatenaGameModel } from "./catena.model";
import { CatenaGameViewContext, ReazioneCatenaGameView } from "./catena.view";


/**
 * Controller for the Catena game.
 *
 * Coordinates word progression, letter reveal transitions, admin interactions,
 * and live state updates for the active Catena game session.
 */
export class ReazioneCatenaGameController extends GameController implements CatenaGameViewContext {
    model: ReazioneCatenaGameModel;
    view: ReazioneCatenaGameView;

    constructor(ctx: GameControllerContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false){
        super(ctx);
        this.model = new ReazioneCatenaGameModel(this, def, restoreState);
        this.view = new ReazioneCatenaGameView(this);
        this.stateUpdated();
    }

    /**
     * Advance to the next word in the chain.
     *
     * Resets the letter reveal count and updates the secret values for the
     * newly active word.
     * @returns `true` when another word exists, otherwise `false`.
     */
    nextWord() : boolean{
        const next = this.model.currentWordIndex+1;
        const nextw = this.model.getWord(next);
        if(!!nextw) {
            this.model.currentWordIndex = next;
            this.model.currentWordLetters = 0;
            this.model.setSecret("currentword", this.model.getWordAsSecret(next)!);
            this.model.setSecret("currentwordlength", new Secret(String(nextw.length), ()=>"***"));
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