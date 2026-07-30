import { CancelHandle, delay } from "../../general.utils";
import { ResumeCheckpoints } from "../../admin.utils";
import { Question } from "../../questions/questions.admin.base";
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

    private sanitizeAnswer(value: string): string {
        return value.trim().toLowerCase().replace(/\s+/g, " ");
    }

    private currentExpectedAnswer(): string {
        return this.sanitizeAnswer(this.controller.model.getCurrentWord() ?? "");
    }

    private hasCorrectAnswerForExpectedAnswer(expectedAnswer: string, answers: QuestionAnswers): boolean {
        for (const { answer } of answers.values()) {
            if (this.sanitizeAnswer(answer) === expectedAnswer) {
                return true;
            }
        }
        return false;
    }

    private showRandomLetterLoop(): CancelHandle{
        let isCanceled = false;
        let interval : number|undefined = undefined;
        
        const cancel = ()=>{
            if(isCanceled) return;
            isCanceled = true;
            if(interval) {
                clearInterval(interval);
                interval = undefined;
            }
            this.controller.view.removeFooterChoice();
        }

        if(this.controller.model.delayBetweenLetterDisplay){
            interval = setInterval(()=>{
                if(isCanceled) throw new Error("Running interval with isCanceled true is unexpected.");
                if(!this.controller.nextRandomLetter()){
                    cancel();
                }
            }, this.controller.model.delayBetweenLetterDisplay)
        }

        const adminOptionsBuilder = () => {
            return {advanceBtn: "Aggiungi una lettera", ...(interval ? {otherBtn: "Cancella timer automatico"} : {})}
        }
        const adminAction = (result: boolean|null) => {
            if(isCanceled) return;
            if(result===null || (result===true && !this.controller.nextRandomLetter())){
                cancel();
                return;
            }
            if(result===false && interval){
                clearInterval(interval);
                interval = undefined;
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

            const expectedAnswer = this.currentExpectedAnswer();
            const ender = {
                manual: true,
                ...(this.controller.model.stopAtFirstCorrectAnswer
                    ? { stopWhen: (answers: QuestionAnswers) => this.hasCorrectAnswerForExpectedAnswer(expectedAnswer, answers) }
                    : {}),
            };

            this.currentQ = new TextInputQuestion(
                this,
                {
                    auto: (answer) => this.sanitizeAnswer(answer) === expectedAnswer,
                    manual: true,
                },
                ender,
            );

            const handle = this.showRandomLetterLoop();
            await this.currentQ.ask({
                onAnswerClosed: handle,
                beforeShowResults: async (result) => {
                    await this.controller.adminInteraction({ advanceBtn: "Mostra la risposta" });
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
