import { Secret } from "../../general.utils";
import { GameController, GameControllerContext, GameModel, GameModelContext, GameView, GameViewContext } from "../games.admin.base";
import { NumericEstimationGameDefinition } from "./numeric_estimation.admin.definition";
import { NumericEstimationGameRequiredData, NumericEstimationGameStateSnapshot, NumericEstimationState } from "./numeric_estimation.contracts";

export class NumericEstimationGameModel extends GameModel<NumericEstimationGameDefinition, NumericEstimationGameStateSnapshot> {
    definition: NumericEstimationGameDefinition;
    state: NumericEstimationState;
    currentQuestionIndex: number;
    displayQuestion: string;
    displayCorrectAnswer: string;
    timeForQuestion: number;
    ifNoCorrectAnswers: NumericEstimationGameStateSnapshot["ifNoCorrectAnswers"];
    pointsForCorrectAnswer: number;

    constructor(ctx: GameModelContext, def: NumericEstimationGameDefinition) {
        super(ctx);
        this.definition = def;
        this.state = NumericEstimationState.STARTING;
        this.currentQuestionIndex = -1;
        this.displayQuestion = "";
        this.displayCorrectAnswer = "";
        this.timeForQuestion = def.data.timeForQuestion;
        this.ifNoCorrectAnswers = def.data.ifNoCorrectAnswers;
        this.pointsForCorrectAnswer = def.data.pointsForCorrectAnswer;
    }

    parseFromJSON(data: Partial<NumericEstimationGameStateSnapshot>): boolean {
        this.state = data.state ?? NumericEstimationState.STARTING;
        this.currentQuestionIndex = data.currentQuestionIndex ?? -1;
        this.displayQuestion = data.displayQuestion ?? "";
        this.displayCorrectAnswer = data.displayCorrectAnswer ?? "";
        this.timeForQuestion = data.timeForQuestion ?? this.definition.data.timeForQuestion;
        this.ifNoCorrectAnswers = data.ifNoCorrectAnswers ?? this.definition.data.ifNoCorrectAnswers;
        this.pointsForCorrectAnswer = data.pointsForCorrectAnswer ?? this.definition.data.pointsForCorrectAnswer;
        return true;
    }

    getQuestion(i: number): string | null {
        if (i in this.definition.data.questions) {
            return this.definition.data.questions[i]!;
        }
        return null;
    }

    getQuestionAsSecret(i: number): Secret<string> | null {
        const question = this.getQuestion(i);
        if (!question) return null;
        return new Secret(question, () => "***");
    }

    getNumericAnswerAndUnit(): [number, string]|null{
        const currentAnswer = this.getCurrentAnswer();
        if (!currentAnswer) return null;

        const match = currentAnswer.match(/^\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*(.*?)\s*$/);
        if (!match) return null;

        const numericRaw = match[1]!.replace(",", ".");
        const parsedValue = Number.parseFloat(numericRaw);
        if (Number.isNaN(parsedValue)) return null;

        const unit = match[2] ?? "";
        return [parsedValue, unit];
    }
    getAnswer(i: number): string | null {
        if (i in this.definition.data.correctAnswers) {
            return this.definition.data.correctAnswers[i]!;
        }
        return null;
    }

    getAnswerAsSecret(i: number): Secret<string> | null {
        const answer = this.getAnswer(i);
        if (!answer) return null;
        return new Secret(answer, () => "***");
    }

    getCurrentQuestion(): string | null {
        return this.getQuestion(this.currentQuestionIndex);
    }

    getCurrentAnswer(): string | null {
        return this.getAnswer(this.currentQuestionIndex);
    }

    toJSON(): NumericEstimationGameStateSnapshot {
        return {
            ...NumericEstimationGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            currentQuestionIndex: this.currentQuestionIndex,
            displayQuestion: this.displayQuestion,
            displayCorrectAnswer: this.displayCorrectAnswer,
            timeForQuestion: this.timeForQuestion,
            ifNoCorrectAnswers: this.ifNoCorrectAnswers,
            pointsForCorrectAnswer: this.pointsForCorrectAnswer,
        };
    }
}

export interface NumericEstimationGameViewContext extends GameViewContext<NumericEstimationGameDefinition> {
    model: NumericEstimationGameModel;
}

export class NumericEstimationGameView extends GameView {
    activeGameContext: NumericEstimationGameViewContext | null;
    gameDef: NumericEstimationGameDefinition;

    constructor(ctx: NumericEstimationGameViewContext | null = null, gameDef: NumericEstimationGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        this.gameDef = this.readDefinition(ctx, gameDef);
    }

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.data.questions.map((question, index) => ((s: boolean) => `Domanda ${index + 1}: ${s ? question : "***"}`)),
            "Conclusione",
        ];
    }

    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        const stepCount = this.getSteps().length;
        switch (this.activeGameContext.model.state) {
            case NumericEstimationState.DISPLAYCOVER:
                if (this.activeGameContext.model.currentQuestionIndex < 0) {
                    return 0;
                }
            case NumericEstimationState.ASKINGQUESTION:
            case NumericEstimationState.SHOWINGANSWER:
                return 1 + this.activeGameContext.model.currentQuestionIndex;
            case NumericEstimationState.ENDING:
                return stepCount - 1;
            default:
                return 0;
        }
    }

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const showSecrets = this.canDisplaySecrets();
        const displayedQuestion = this.activeGameContext.model.displayQuestion || (this.activeGameContext.model
            .getQuestionAsSecret(this.activeGameContext.model.currentQuestionIndex)
            ?.read(showSecrets) ?? "?");
        const displayedAnswer = this.activeGameContext.model.displayCorrectAnswer || (this.activeGameContext.model
            .getAnswerAsSecret(this.activeGameContext.model.currentQuestionIndex)
            ?.read(showSecrets) ?? "?");

        container.innerHTML = `
            Titolo: ${this.activeGameContext.model.definition.data.title}<br/>
            Stato: ${this.activeGameContext.model.state}<br/>
            Domanda corrente: ${this.activeGameContext.model.currentQuestionIndex + 1}<br/>
            Testo domanda: ${displayedQuestion}<br/>
            Risposta corretta: ${displayedAnswer}<br/>
            Tempo per domanda: ${this.activeGameContext.model.timeForQuestion}s<br/>
            Politica se nessuna risposta corretta: ${this.activeGameContext.model.ifNoCorrectAnswers || "nessuna"}
        `;
    }
}

export class NumericEstimationGameController extends GameController implements NumericEstimationGameViewContext {
    model: NumericEstimationGameModel;
    view: NumericEstimationGameView;

    constructor(ctx: GameControllerContext, def: NumericEstimationGameDefinition) {
        super(ctx);
        this.model = new NumericEstimationGameModel(this, def);
        this.view = new NumericEstimationGameView(this);
    }

    nextQuestion(): boolean {
        const next = this.model.currentQuestionIndex + 1;
        const nextQuestion = this.model.getQuestion(next);
        if (!!nextQuestion) {
            this.model.currentQuestionIndex = next;
            this.stateUpdated();
            return true;
        } else {
            return false;
        }
    }

    displayCurrentQuestion(b: boolean): void {
        this.model.displayQuestion = b ? (this.model.getCurrentQuestion() ?? "") : "";
    }

    displayCorrectAnswer(unit: boolean, answer: boolean): void {
        this.model.displayCorrectAnswer = answer ? (this.model.getCurrentAnswer() ?? "") : unit ? "??? " + (this.model.getNumericAnswerAndUnit()?.[1] ?? "") : "";
    }

    setState(s: NumericEstimationState): void {
        this.displayCurrentQuestion(s === NumericEstimationState.ASKINGQUESTION || s === NumericEstimationState.SHOWINGANSWER);
        this.displayCorrectAnswer(s === NumericEstimationState.ASKINGQUESTION || s === NumericEstimationState.SHOWINGANSWER, s === NumericEstimationState.SHOWINGANSWER);
        this.model.state = s;
        this.stateUpdated();
    }
}
