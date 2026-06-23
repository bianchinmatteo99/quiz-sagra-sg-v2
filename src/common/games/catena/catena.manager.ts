import { Question } from "../../questions/question.base";
import { TextInputQuestion } from "../../questions/text_input/text_input.question";
import { GameManager, GameManagerContext } from "../game.base";
import { ReazioneCatenaGameController } from "./catena.controller";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { CatenaState } from "./catena.model";


export class ReazioneCatenaGameManager extends GameManager {
    controller: ReazioneCatenaGameController;
    currentQ: Question | null = null;

    constructor(ctx: GameManagerContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false) {
        super(ctx);
        this.controller = new ReazioneCatenaGameController(this, def, restoreState);
    }

    async startGame(): Promise<void> {
        this.controller.setState(CatenaState.DISPLAYCOVER);
        await this.controller.adminInteraction({ advanceBtn: "Mostra la catena" });

        this.controller.setState(CatenaState.DISPLAYCHAIN);
        await this.controller.adminInteraction({ advanceBtn: "Inizia con la prima parola" });

        while (this.controller.nextWord()) {
            const w = this.controller.model.getCurrentWord();
            this.controller.model.currentDenyList = [];
            while (await this.controller.nextLetter(1000)) {
                this.controller.setState(CatenaState.ASKINGQUESTION);
                this.currentQ = new TextInputQuestion(this, { auto: w!, manual: true }, { timer: this.controller.model.definition.timeForAnswer }, this.controller.model.currentDenyList);
                const res = await this.currentQ.ask();

                const correct = res.filter((v) => v.correct).map((v) => v.id);
                if (correct.length > 0) {
                    await this.controller.completeWord(5000);
                    this.context.updateRanking(new Map(correct.map((id) => [id, this.controller.model.definition.pointsForCorrectAnswer])));
                    // this.controller.displayWinners(); and await adminInteraction
                    this.currentQ.clear();
                    this.currentQ = null;
                    break;
                }

                this.currentQ.clear();
                this.currentQ = null;

                if (! await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima lettera", otherBtn: "Completa la parola e vai alla prossima" })) {
                    await this.controller.completeWord(5000);
                    break;
                }

                if (!this.controller.model.definition.canRetryForSameWord) {
                    for (const r of res) {
                        if (!r.correct && !this.controller.model.currentDenyList.includes(r.id)) {
                            this.controller.model.currentDenyList.push(r.id)
                        }
                    }
                }
            }
            this.controller.setState(CatenaState.DISPLAYCHAIN);
            await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima parola o concludi" });
        }
        this.controller.setState(CatenaState.ENDING);
        this.endGame();
    }

}