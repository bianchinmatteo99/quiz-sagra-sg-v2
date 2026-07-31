import { CancelHandle, delay } from "../../general.utils";
import { ResumeCheckpoints } from "../../admin.utils";
import { Question, StopWhenBuildersCollection } from "../../questions/questions.admin.base";
import { TextInputQuestion } from "../../questions/text_input/text_input.question.admin";
import { GameManager, GameManagerContext } from "../games.admin.base";
import { GuessWordGameDefinition } from "./guess_word.admin.definition";
import { GuessWordGameController } from "./guess_word.admin.mvc";
import { GuessWordState } from "./guess_word.contract";
import { QuestionAnswers } from "../../questions/question.contract";

export class GuessWordGameManager extends GameManager {
    controller: GuessWordGameController;
    currentQ: Question | null = null;

    constructor(ctx: GameManagerContext, def: GuessWordGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new GuessWordGameController(this, def);
    }

    private getLetterDisplayDelayMs(): number | false {
        const delaySeconds = this.controller.model.delayBetweenLetterDisplay;
        return delaySeconds === false ? false : delaySeconds * 1000;
    }

    private showRandomLetterLoop(): CancelHandle{
        let isCanceled = false;
        let interval : number|undefined = undefined;
        const delayMs = this.getLetterDisplayDelayMs();
        
        const cancel = ()=>{
            if(isCanceled) return;
            isCanceled = true;
            if(interval) {
                clearInterval(interval);
                interval = undefined;
            }
            this.controller.view.removeFooterChoice();
        }

        const maybeStartInterval = ()=>{
            if(isCanceled || delayMs === false) return;
            clearInterval(interval);
            interval = setInterval(()=>{
                if(isCanceled) throw new Error("Running interval with isCanceled true is unexpected.");
                if(!this.controller.nextRandomLetter()){
                    cancel();
                }
            }, delayMs)
        }
        maybeStartInterval();

        const adminOptionsBuilder = () => {
            return {advanceBtn: "Aggiungi una lettera", ...(interval ? {otherBtn: "Cancella timer automatico"} : {})}
        }
        const adminAction = (result: boolean|null) => {
            if(isCanceled) return;
            if(result===null || (result===true && !this.controller.nextRandomLetter())){
                cancel();
                return;
            }
            if(interval){
                clearInterval(interval);
                interval = undefined;
                if(result===true){
                    maybeStartInterval();
                }
            }
            
            if(!isCanceled){
                this.controller.adminInteraction(adminOptionsBuilder()).then(adminAction, ()=>adminAction(null))
            }
        }
        this.controller.adminInteraction(adminOptionsBuilder()).then(adminAction, ()=>adminAction(null))

        return cancel;
    }

    async startGame(): Promise<boolean> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(GuessWordState.DISPLAYCOVER);
        }

        while (this.controller.nextWord()) {
            if (!await this.controller.adminInteraction({ advanceBtn: "Inizia questa parola", otherBtn: "Salta questa parola" })) {
                continue;
            }

            this.controller.setState(GuessWordState.ASKINGQUESTION);

            const ender = {
                manual: true,
                ...(this.controller.model.stopAtFirstCorrectAnswer
                    ? { stopWhen: StopWhenBuildersCollection.HasAnswerEqualTo(this.controller.model.getCurrentWord()!) }
                    : {}),
            };

            this.currentQ = new TextInputQuestion(
                this,
                {
                    auto: this.controller.model.getCurrentWord()!,
                    manual: true,
                },
                ender,
            );

            const handle = this.showRandomLetterLoop();
            await this.currentQ.ask({
                onAnswerClosed: handle,
                beforeShowResults: async (result) => {
                    const correct = result.entries().filter(([_, ok]) => ok).map(([id]) => id).toArray();
                    this.controller.completeWord();
                    this.controller.stateUpdated();
                    setTimeout(() => {
                        this.context.updateRanking(new Map(correct.map((id) => [id, this.controller.model.pointsForCorrectAnswer])));
                    }, 500);
                    return 4000;
                },
            });

            await this.controller.adminInteraction({ advanceBtn: "Concludi parola" });
            this.currentQ.clear();
            this.currentQ = null;
            this.controller.setState(GuessWordState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(GuessWordState.ENDING);
        return this.endGame();
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state === GuessWordState.ENDING) {
                    return false;
                }

                if (this.controller.model.state === GuessWordState.ASKINGQUESTION && this.controller.model.currentWordIndex >= 0) {
                    const currentIndex = this.controller.model.currentWordIndex;
                    this.controller.model.currentWordIndex = currentIndex;
                }

                endResume();
                return true;
            },
            "end-phase": (endResume) => {
                endResume();
                return true;
            },
        });
    }
}
