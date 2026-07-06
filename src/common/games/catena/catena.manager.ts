import { delay } from "../../general.utils";
import { Question } from "../../questions/question.base";
import { TextInputQuestion } from "../../questions/text_input/text_input.question";
import { GameManager, GameManagerContext } from "../game.base";
import { ReazioneCatenaGameController } from "./catena.controller";
import { ReazioneCatenaGameDefinition } from "./catena.definition";
import { CatenaState } from "./catena.model";


/**
 * Manager that orchestrates the Catena gameplay loop.
 *
 * Advances through the chain word by word, reveals letters progressively,
 * asks for text input, and awards points for correct answers.
 */
export class ReazioneCatenaGameManager extends GameManager {
    controller: ReazioneCatenaGameController;
    /** The currently active question while the game waits for player input. */
    currentQ: Question | null = null;

    constructor(ctx: GameManagerContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false) {
        super(ctx);
        this.controller = new ReazioneCatenaGameController(this, def, restoreState);
    }

    /**
     * Execute the Catena game flow.
     *
     * Shows the cover and chain screens, then for each word reveals letters one
     * at a time while asking players for answers. Correct responses complete the
     * word and award points; incorrect answers may be denied for retries.
     */
    async startGame(): Promise<void> {
        // Show the cover screen first and wait for admin to advance.
        this.controller.setState(CatenaState.DISPLAYCOVER);
        await this.controller.adminInteraction({ advanceBtn: "Mostra la catena" });

        // Switch to the chain display and wait for admin to start the first word.
        this.controller.setState(CatenaState.DISPLAYCHAIN);
        await this.controller.adminInteraction({ advanceBtn: "Inizia con la prima parola" });

        // For each word in the chain: reset per-word state and reveal letters one by one.
        while (this.controller.nextWord()) {
            const w = this.controller.model.getCurrentWord();
            // Track players who are denied for the current word (cannot retry).
            this.controller.model.currentDenyList = [];

            // Reveal letters progressively; for each revealed letter prompt players.
            while (await this.controller.nextLetter(1000)) {
                // Move UI to asking-question state and create a text-input question.
                this.controller.setState(CatenaState.ASKINGQUESTION);
                this.currentQ = new TextInputQuestion(this, { auto: w!, manual: true }, { timer: this.controller.model.definition.timeForAnswer }, this.controller.model.currentDenyList);

                // Ask the question and provide a hook to run just before showing results.
                const res = await this.currentQ.ask({
                    beforeShowResults: async (res) => {
                        // Collect IDs of players who answered correctly.
                        const correct = res.entries().filter(([id, v]) => v).map(([id, v]) => id).toArray();

                        if (correct.length > 0) {
                            // If somebody got it right, complete the word, and award points.
                            await this.controller.completeWord(5000);
                            // Defer ranking update slightly so UI can show winners.
                            setTimeout(() => {
                                this.context.updateRanking(new Map(correct.map((id) => [id, this.controller.model.definition.pointsForCorrectAnswer])));
                            }, 1000);
                        } else if (! await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima lettera", otherBtn: "Completa la parola e vai alla prossima" })) {
                            // If nobody answered correctly and admin chose to complete, finish the word.
                            await this.controller.completeWord(5000);
                        }

                        // Keep showing results for a short fixed duration.
                        return 5000;
                    }
                });

                // If retries are not allowed, add players who failed to the deny list.
                if (!this.controller.model.definition.canRetryForSameWord) {
                    for (const [id, r] of res) {
                        if (!r && !this.controller.model.currentDenyList.includes(id)) {
                            this.controller.model.currentDenyList.push(id)
                        }
                    }
                }

                // Clear and discard the question instance before moving on.
                this.currentQ.clear();
                this.currentQ = null;
            }

            // After the word is completed, return to chain display and wait for admin.
            this.controller.setState(CatenaState.DISPLAYCHAIN);
            await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima parola o concludi" });
        }

        // No more words: set ending state and finalize the game.
        this.controller.setState(CatenaState.ENDING);
        this.endGame();
    }

}