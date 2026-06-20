import { Question } from "../../questions/question.base";
import { TextInputQuestion } from "../../questions/text_input/text_input.question";
import { GameManager, GameManagerContext } from "../game.base";
import { ReazioneCatenaGameController } from "./catena.controller";
import { ReazioneCatenaGameDefinition } from "./catena.definition";


export class ReazioneCatenaGameManager extends GameManager {
    controller: ReazioneCatenaGameController;
    currentQ: Question|null = null;

    constructor(ctx: GameManagerContext, def: ReazioneCatenaGameDefinition, restoreState:boolean = false){
        super(ctx);
        this.controller = new ReazioneCatenaGameController(this, def, restoreState);
    }

    async startGame(): Promise<void> {
        console.log("Game started!");
        this.currentQ = new TextInputQuestion(this, {auto: "Risposta"}, {timer: 20});
        await this.currentQ.ask();
    }
    endGame(): void {
        throw new Error("Method not implemented.");
    }
    
}