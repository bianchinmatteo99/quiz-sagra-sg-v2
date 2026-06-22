import { Question } from "../../questions/question.base";
import { TextInputQuestion } from "../../questions/text_input/text_input.question";
import { GameManager, GameManagerContext } from "../game.base";
import { ReazioneCatenaGameController } from "./catena.controller";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { CatenaState } from "./catena.model";


export class ReazioneCatenaGameManager extends GameManager {
    controller: ReazioneCatenaGameController;
    currentQ: Question|null = null;

    constructor(ctx: GameManagerContext, def: ReazioneCatenaGameDefinition, restoreState:boolean = false){
        super(ctx);
        this.controller = new ReazioneCatenaGameController(this, def, restoreState);
    }

    async startGame(): Promise<void> {
        console.log("Game started!");
        this.controller.setState(CatenaState.DISPLAYCOVER);
        await this.controller.adminInteraction({advanceBtn: "Mostra la catena"});

        this.controller.setState(CatenaState.DISPLAYCHAIN);
        await this.controller.adminInteraction({advanceBtn: "Inizia con la prima parola"});

        while(this.controller.nextWord()){
            const w = this.controller.model.getCurrentWord();
            const deny: string[] = [];
            while(await this.controller.nextLetter(1000)){
                this.controller.setState(CatenaState.ASKINGQUESTION);
                this.currentQ = new TextInputQuestion(this, {auto: w}, {timer: this.controller.model.definition.timeForAnswer}, deny);
                const res = await this.currentQ.ask();

                const correct = res.filter((v)=>v.correct).map((v)=>v.id);
                if (correct.length>0){
                    await this.controller.completeWord(5000);
                    // this.context.updateRanking(null)
                    // this.controller.displayWinners(); and await adminInteraction
                    break;
                }
                
                if(! await this.controller.adminInteraction({advanceBtn: "Passa alla prossima lettera", otherBtn: "Completa la parola e vai alla prossima"})){
                    await this.controller.completeWord(5000);
                    break;
                }

                if(!this.controller.model.definition.canRetryForSameWord){
                    for(const r of res){
                        if(!r.correct && !deny.includes(r.id)){
                            deny.push(r.id)
                        }
                    }
                }
            }
            this.controller.setState(CatenaState.DISPLAYCHAIN);
            await this.controller.adminInteraction({advanceBtn: "Passa alla prossima parola o concludi"});
        }
        this.controller.setState(CatenaState.ENDING);        
    }

    endGame(): void {
        throw new Error("Method not implemented.");
    }
    
}