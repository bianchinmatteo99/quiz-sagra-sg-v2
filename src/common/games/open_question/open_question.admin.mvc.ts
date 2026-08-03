import { Secret } from "../../general.utils";
import { GameController, GameControllerContext, GameModel, GameModelContext, GameView, GameViewContext } from "../games.admin.base";
import { OpenQuestionGameDefinition } from "./open_question.admin.definition";
import { OpenQuestionGameRequiredData, OpenQuestionGameStateSnapshot, OpenQuestionState } from "./open_question.contracts";

export class OpenQuestionGameModel extends GameModel<OpenQuestionGameDefinition, OpenQuestionGameStateSnapshot> {
    definition: OpenQuestionGameDefinition;
    state: OpenQuestionState;
    currentQuestionIndex: number;
    displayQuestion: string;
    displayCorrectAnswer: string;
    limitTrialsPerQuestion: number;
    stopWhenFirstHandIsRaised: boolean;
    pointsForCorrectAnswer: number;

    constructor(ctx: GameModelContext, def: OpenQuestionGameDefinition) {
        super(ctx);
        this.definition = def;
        this.state = OpenQuestionState.STARTING;
        this.currentQuestionIndex = -1;
        this.displayQuestion = "";
        this.displayCorrectAnswer = "";
        this.limitTrialsPerQuestion = def.data.limitTrialsPerQuestion;
        this.stopWhenFirstHandIsRaised = def.data.stopWhenFirstHandRaised;
        this.pointsForCorrectAnswer = def.data.pointsForCorrectAnswer;
    }

    parseFromJSON(data: Partial<OpenQuestionGameStateSnapshot>): boolean {
        this.state = data.state ?? OpenQuestionState.STARTING;
        this.currentQuestionIndex = data.currentQuestionIndex ?? -1;
        this.displayQuestion = data.displayQuestion ?? "";
        this.displayCorrectAnswer = data.displayCorrectAnswer ?? "";
        this.limitTrialsPerQuestion = data.limitTrialsPerQuestion ?? this.definition.data.limitTrialsPerQuestion;
        this.stopWhenFirstHandIsRaised = data.stopWhenFirstHandIsRaised ?? this.definition.data.stopWhenFirstHandRaised;
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

    toJSON(): OpenQuestionGameStateSnapshot {
        return {
            ...OpenQuestionGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            currentQuestionIndex: this.currentQuestionIndex,
            displayQuestion: this.displayQuestion,
            displayCorrectAnswer: this.displayCorrectAnswer,
            limitTrialsPerQuestion: this.limitTrialsPerQuestion,
            stopWhenFirstHandIsRaised: this.stopWhenFirstHandIsRaised,
            pointsForCorrectAnswer: this.pointsForCorrectAnswer,
        };
    }
}

export interface OpenQuestionGameViewContext extends GameViewContext<OpenQuestionGameDefinition> {
    model: OpenQuestionGameModel;
}

export class OpenQuestionGameView extends GameView {
    activeGameContext: OpenQuestionGameViewContext | null;
    gameDef: OpenQuestionGameDefinition;

    constructor(ctx: OpenQuestionGameViewContext | null = null, gameDef: OpenQuestionGameDefinition | null = null) {
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
            case OpenQuestionState.DISPLAYCOVER:
                if (this.activeGameContext.model.currentQuestionIndex < 0) {
                    return 0;
                }
            case OpenQuestionState.ASKINGQUESTION:
            case OpenQuestionState.SHOWINGANSWER:
                return 1 + this.activeGameContext.model.currentQuestionIndex;
            case OpenQuestionState.ENDING:
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
            Risposta corretta: ${displayedAnswer}
        `;
    }
}

export class OpenQuestionGameController extends GameController implements OpenQuestionGameViewContext {
    model: OpenQuestionGameModel;
    view: OpenQuestionGameView;

    constructor(ctx: GameControllerContext, def: OpenQuestionGameDefinition) {
        super(ctx);
        this.model = new OpenQuestionGameModel(this, def);
        this.view = new OpenQuestionGameView(this);
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

    displayCorrectAnswer(b: boolean): void {
        this.model.displayCorrectAnswer = b ? (this.model.getCurrentAnswer() ?? "") : "";
    }

    setState(s: OpenQuestionState): void {
        this.displayCurrentQuestion(s === OpenQuestionState.ASKINGQUESTION || s === OpenQuestionState.SHOWINGANSWER);
        this.displayCorrectAnswer(s === OpenQuestionState.SHOWINGANSWER);
        this.model.state = s;
        this.stateUpdated();
    }
}
