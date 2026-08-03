import { ResumeCheckpoints } from "../../admin.utils";
import { TextInputQuestion } from "../../questions/text_input/text_input.question.admin";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { PenaltyHandler } from "../games.admin.utils";
import { ZipGameDefinition } from "./zip.admin.definition";
import { ZipGameController } from "./zip.admin.mvc";
import { ZipState } from "./zip.contracts";

/**
 * Runtime orchestrator for a Zip game session.
 *
 * A zip is solved by guessing all internal words at once (everything except
 * first and last word), while letters are progressively revealed.
 */
export class ZipGameManager extends GameManager {
    /** Controller owning Zip model state and admin-facing rendering. */
    controller: ZipGameController;

    constructor(ctx: GameManagerContext, def: ZipGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new ZipGameController(this, def);
    }

    private currentZipExpectedAnswer(): string {
        const currentZip = this.controller.model.getCurrentZip() ?? [];
        const innerWords = currentZip.slice(1, -1);
        return innerWords.join(" ");
    }

    /**
     * Execute the Zip game flow.
     */
    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(ZipState.DISPLAYCOVER);
        }

        while (this.controller.nextWord()) {
            if (! await this.controller.adminInteraction({ advanceBtn: "Inizia questo zip", otherBtn: "Salta questo zip" })) {
                continue;
            }

            const penaltyHandler = new PenaltyHandler({
                limitWrongTrials: this.controller.model.canRetryForSameZip ? undefined : 1,
            });
            this.controller.setState(ZipState.ASKINGQUESTION);
            while (await this.controller.nextLetter(1000)) {
                this.activeQuestion = new TextInputQuestion(
                    this,
                    {
                        auto: this.currentZipExpectedAnswer(),
                        manual: true,
                    },
                    { timer: this.controller.model.timeForAnswer },
                    penaltyHandler.getCurrentDenyList(),
                );

                const res = await this.activeQuestion.ask({
                    beforeShowResults: async (res) => {
                        const correct = res.entries().filter(([id, v]) => v).map(([id, v]) => id).toArray();

                        if (correct.length > 0) {
                            await this.controller.completeZip(3000);
                            setTimeout(() => {
                                this.context.updateRanking(new Map(correct.map((id) => [id, this.controller.model.pointsForCorrectAnswer])));
                            }, 1000);
                        }

                        return 4000;
                    }
                });

                const correctN = res.entries().filter(([id, v]) => v).map(([id, v]) => id).toArray().length;
                if (correctN === 0) {
                    if (! await this.controller.adminInteraction({ advanceBtn: "Passa alla prossima lettera", otherBtn: "Completa lo zip e vai al prossimo" })) {
                        await this.controller.completeZip(6000);
                    }
                } else {
                    await this.controller.adminInteraction({ advanceBtn: "Concludi la domanda" });
                }

                penaltyHandler.updateWith(res);

                this.activeQuestion.clear();
                this.activeQuestion = null;
            }

            this.controller.setState(ZipState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(ZipState.ENDING);
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state == ZipState.ENDING) {
                    return false;
                }

                if (this.controller.model.state == ZipState.ASKINGQUESTION && this.controller.model.currentZip >= 0) {
                    this.controller.model.currentZipLetters = 0;
                }

                endResume();
                return true;
            },
            "end-phase": (endResume) => {
                endResume();
                return true;
            }
        });
    }
}
