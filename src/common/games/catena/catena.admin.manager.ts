import { Question } from "../../questions/question.base";
import { TextInputQuestion } from "../../questions/text_input/text_input.question";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { CatenaState } from "./catena.contracts";
import { CatenaGameDefinition } from "./catena.admin.definition";
import { CatenaGameController } from "./catena.admin.mvc";

/**
 * Runtime orchestrator for a Catena game session.
 *
 * Coordinates controller state transitions, question lifecycle, and ranking
 * updates while the game progresses through its configured word chain.
 */
export class CatenaGameManager extends GameManager {
    /** Controller owning Catena model state and admin-facing rendering. */
    controller: CatenaGameController;
    /** The currently active question while the game waits for player input. */
    currentQ: Question | null = null;

    /**
     * Create a Catena manager bound to host-level game context.
     *
     * @param ctx Manager context provided by the quiz runtime.
     * @param def Parsed Catena game definition for this session.
     * @param restoreState When true, controller/model attempt state restoration.
     */
    constructor(ctx: GameManagerContext, def: CatenaGameDefinition, restoreState: boolean = false) {
        super(ctx);
        this.controller = new CatenaGameController(this, def, restoreState);
    }

    /**
     * Execute the Catena game flow.
     *
    * Flow summary:
    * - show cover and chain intro states,
    * - for each progressed word, reveal letters and ask a text-input question,
    * - complete words on correct answers (or admin override),
    * - update rankings for correct responders,
    * - optionally deny retries for incorrect responders on the same word.
    *
    * Side effects:
    * - updates and persists game state through controller transitions,
    * - creates and clears question UI/state for each ask cycle,
    * - writes ranking deltas through the host context.
    *
    * @returns Result of {@link GameManager.endGame}, used by quiz flow to decide
    * idle-screen behavior (for example showing ranking).
     */
    async startGame(): Promise<boolean> {
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
                this.currentQ = new TextInputQuestion(this, { auto: w!, manual: true }, { timer: this.controller.model.definition.data.timeForAnswer }, this.controller.model.currentDenyList);

                // Ask the question and run post-evaluation logic before results are shown.
                const res = await this.currentQ.ask({
                    beforeShowResults: async (res) => {
                        // Collect IDs of players who answered correctly.
                        const correct = res.entries().filter(([id, v]) => v).map(([id, v]) => id).toArray();

                        if (correct.length > 0) {
                            // If somebody got it right, complete the word, and award points.
                            await this.controller.completeWord(5000);
                            // Defer ranking update slightly so UI can show winners.
                            setTimeout(() => {
                                this.context.updateRanking(new Map(correct.map((id) => [id, this.controller.model.definition.data.pointsForCorrectAnswer])));
                            }, 1000);
                        }

                        // Keep the results screen visible for a fixed duration.
                        return 5000;
                    }
                });

                const correctN = res.entries().filter(([id, v]) => v).map(([id, v]) => id).toArray().length;
                if(correctN == 0){
                    // If nobody answered correctly and admin chose to complete, finish the word.
                    if(! await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima lettera", otherBtn: "Completa la parola e vai alla prossima" })){
                        await this.controller.completeWord(1000);
                    }
                } else {
                    await this.controller.adminInteraction({ advanceBtn: "Concludi la domanda"})
                }

                // If retries are not allowed, add players who failed to the deny list.
                if (!this.controller.model.definition.data.canRetryForSameWord) {
                    for (const [id, r] of res) {
                        if (!r && !this.controller.model.currentDenyList.includes(id)) {
                            this.controller.model.currentDenyList.push(id)
                        }
                    }
                }

                // Always clear question resources before moving to the next cycle.
                this.currentQ.clear();
                this.currentQ = null;
            }

            // After the word is completed, return to chain display and wait for admin.
            this.controller.setState(CatenaState.DISPLAYCHAIN);
            await this.controller.adminInteraction({ advanceBtn: "Inizia la prossima parola o concludi" });
        }

        // No more words: set ending state and finalize the game.
        this.controller.setState(CatenaState.ENDING);
        return this.endGame();
    }
}
