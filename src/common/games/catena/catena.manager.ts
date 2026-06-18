import { GameManager, GameManagerContext } from "../game.base";
import { ReazioneCatenaGameController } from "./catena.controller";
import { ReazioneCatenaGameDefinition } from "./catena.definition";


export class ReazioneCatenaGameManager extends GameManager {
    controller: ReazioneCatenaGameController;

    constructor(ctx: GameManagerContext, def: ReazioneCatenaGameDefinition, restoreState:boolean = false){
        super(ctx);
        this.controller = new ReazioneCatenaGameController(this, def, restoreState);
    }

    startGame(): void {
        console.log("Game started!")
    }
    endGame(): void {
        throw new Error("Method not implemented.");
    }
    
}