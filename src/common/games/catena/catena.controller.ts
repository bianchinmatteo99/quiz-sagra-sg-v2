import { delay } from "../../general.interfaces";
import { GameController, GameControllerContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { CatenaState, ReazioneCatenaGameModel } from "./catena.model";
import { CatenaGameViewContext, ReazioneCatenaGameView } from "./catena.view";


export class ReazioneCatenaGameController extends GameController implements CatenaGameViewContext {
    model: ReazioneCatenaGameModel;
    view: ReazioneCatenaGameView;

    constructor(ctx: GameControllerContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false){
        super(ctx);
        this.model = new ReazioneCatenaGameModel(this, def, restoreState);
        this.view = new ReazioneCatenaGameView(this);
        this.stateUpdated();
    }

    async adminInteraction(options: {advancebtn : string}): Promise<any>{
        throw new Error("Not implemented admin interaction")
    }

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

    async nextLetter(transitionT: number = 0): Promise<boolean>{
        this.model.wordtransitiontime = transitionT;
        const w = this.model.getCurrentWord();
        if(this.model.currentWordLetters < w.length){
            this.model.currentWordLetters+=1;
            this.stateUpdated();
            await delay(transitionT);
        }
        return this.model.currentWordLetters < w.length;
    }

    async completeWord(transitionT : number = 0): Promise<void>{
        this.model.wordtransitiontime = transitionT;
        const w = this.model.getCurrentWord();
        this.model.currentWordLetters = w.length;
        this.stateUpdated();
        await delay(transitionT);
    }

    setState(s:CatenaState){
        this.model.state = s;
        this.stateUpdated();
    }
}