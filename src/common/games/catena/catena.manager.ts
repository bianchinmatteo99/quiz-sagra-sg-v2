import { delay } from "../../general.utils";
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
                const [res, showResults] = await this.currentQ.ask("delegate");

                const correct = res.entries().filter(([id, v]) => v).map(([id, v]) => id).toArray();
                if (correct.length > 0) {
                    await this.controller.completeWord(5000);
                    // this.controller.displayWinners(); and await adminInteraction
                    await showResults(true, 5000);
                    this.context.updateRanking(new Map(correct.map((id) => [id, this.controller.model.definition.pointsForCorrectAnswer])));
                    await delay(2000);
                } else if (await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima lettera", otherBtn: "Completa la parola e vai alla prossima" })) {
                    await showResults(true, 5000);
                    if (!this.controller.model.definition.canRetryForSameWord) {
                        for (const [id, r] of res) {
                            if (!r && !this.controller.model.currentDenyList.includes(id)) {
                                this.controller.model.currentDenyList.push(id)
                            }
                        }
                    }

                } else {
                    await this.controller.completeWord(5000);
                    await showResults(true, 5000);
                }

                await delay(50);
                this.currentQ.clear();
                this.currentQ = null;
            }
            this.controller.setState(CatenaState.DISPLAYCHAIN);
            await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima parola o concludi" });
        }
        this.controller.setState(CatenaState.ENDING);
        this.endGame();
    }

}