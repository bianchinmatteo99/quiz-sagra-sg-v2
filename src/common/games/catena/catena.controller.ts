import { GameController, GameControllerContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { ReazioneCatenaGameModel } from "./catena.model";
import { CatenaGameViewContext, ReazioneCatenaGameView } from "./catena.view";


export class ReazioneCatenaGameController extends GameController implements CatenaGameViewContext {
    model: ReazioneCatenaGameModel;
    view: ReazioneCatenaGameView;

    constructor(ctx: GameControllerContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false){
        super(ctx);
        this.model = new ReazioneCatenaGameModel(this, def, restoreState);
        this.view = new ReazioneCatenaGameView(this);
    }
}