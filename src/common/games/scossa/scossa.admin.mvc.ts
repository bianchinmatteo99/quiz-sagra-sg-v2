import { GameController, GameControllerContext, GameModel, GameModelContext, GameView, GameViewContext } from "../games.admin.base";
import { ScossaGameDefinition } from "./scossa.admin.definition";
import { ScossaGameRequiredData, ScossaGameStateSnapshot, ScossaState, ScossaWordDisplay } from "./scossa.contracts";

export class ScossaGameModel extends GameModel<ScossaGameDefinition, ScossaGameStateSnapshot> {
    definition: ScossaGameDefinition;
    state: ScossaState;
    pointsForCorrectAnswer: number;
    pointsLostForWrongAnswer: number;
    words: string[];
    wrongWords: string[];
    displayWords: ScossaWordDisplay[];

    constructor(ctx: GameModelContext, def: ScossaGameDefinition) {
        super(ctx);
        this.definition = def;
        this.state = ScossaState.STARTING;
        this.pointsForCorrectAnswer = def.data.pointsForCorrectAnswer;
        this.pointsLostForWrongAnswer = def.data.pointsLostForWrongAnswer;
        this.words = [...def.data.words];
        this.wrongWords = [...def.data.wrongWords];
        this.displayWords = this.words.map(() => "available");
    }

    private normalize(value: string): string {
        return value.trim().toUpperCase();
    }

    isWrongWord(value: string): boolean {
        const normalized = this.normalize(value);
        return this.wrongWords.some((word) => this.normalize(word) === normalized);
    }

    getAvailableWords(): string[] {
        return this.words.filter((_, index) => this.displayWords[index] === "available");
    }

    countAvailableWords(): number {
        return this.getAvailableWords().length
    }

    countRemainingWrongWords(): number {
        return this.words.reduce((count, word, index) => {
            if (this.displayWords[index] !== "available") {
                return count;
            }
            return count + (this.isWrongWord(word) ? 1 : 0);
        }, 0);
    }

    findAvailableWordIndex(value: string): number {
        const normalized = this.normalize(value);
        return this.words.findIndex((word, index) => this.displayWords[index] === "available" && this.normalize(word) === normalized);
    }

    setDisplay(index: number, mode: "select" | "correctness"): void {
        if (index < 0 || index >= this.displayWords.length) {
            return;
        }

        if (mode === "select") {
            this.displayWords[index] = "selected";
            return;
        }

        const selectedWord = this.words[index];
        if (!selectedWord) {
            return;
        }

        this.displayWords[index] = this.isWrongWord(selectedWord) ? "wrong" : "correct";
    }

    parseFromJSON(data: Partial<ScossaGameStateSnapshot>): boolean {
        this.state = data.state ?? ScossaState.STARTING;
        this.pointsForCorrectAnswer = data.pointsForCorrectAnswer ?? this.definition.data.pointsForCorrectAnswer;
        this.pointsLostForWrongAnswer = data.pointsLostForWrongAnswer ?? this.definition.data.pointsLostForWrongAnswer;
        this.words = data.words ?? [...this.definition.data.words];

        const baseDisplayWords = data.displayWords ?? this.words.map(() => "available" as ScossaWordDisplay);
        this.displayWords = this.words.map((_, index) => baseDisplayWords[index] ?? "available");
        return true;
    }

    toJSON(): ScossaGameStateSnapshot {
        return {
            ...ScossaGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            pointsForCorrectAnswer: this.pointsForCorrectAnswer,
            pointsLostForWrongAnswer: this.pointsLostForWrongAnswer,
            words: [...this.words],
            displayWords: [...this.displayWords],
        };
    }
}

export interface ScossaGameViewContext extends GameViewContext<ScossaGameDefinition> {
    model: ScossaGameModel;
}

export class ScossaGameView extends GameView {
    activeGameContext: ScossaGameViewContext | null;
    gameDef: ScossaGameDefinition;

    constructor(ctx: ScossaGameViewContext | null = null, gameDef: ScossaGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        this.gameDef = this.readDefinition(ctx, gameDef);
    }

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            "Seleziona parole",
            "Conclusione",
        ];
    }

    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        if (this.activeGameContext.model.state === ScossaState.ENDING) {
            return 2;
        }
        if (this.activeGameContext.model.state === ScossaState.ASKINGQUESTION) {
            return 1;
        }
        return 0;
    }

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const model = this.activeGameContext.model;
        
        container.innerHTML = `
            Titolo: ${model.definition.data.title}<br/>
            Risposte disponibili: ${model.getAvailableWords().length}<br/>
            Parole sbagliate: ${this.canDisplaySecrets() ? model.wrongWords.join(", ") : "***"}<br/>
            Punti risposta corretta: ${model.pointsForCorrectAnswer}<br/>
            Punti persi su risposta sbagliata: ${model.pointsLostForWrongAnswer}
        `;
    }
}

export class ScossaGameController extends GameController implements ScossaGameViewContext {
    model: ScossaGameModel;
    view: ScossaGameView;

    constructor(ctx: GameControllerContext, def: ScossaGameDefinition) {
        super(ctx);
        this.model = new ScossaGameModel(this, def);
        this.view = new ScossaGameView(this);
    }

    setState(state: ScossaState): void {
        this.model.state = state;
        this.stateUpdated();
    }

    selectWord(value: string): number {
        const index = this.model.findAvailableWordIndex(value);
        if (index >= 0) {
            this.model.setDisplay(index, "select");
            this.stateUpdated();
        }
        return index;
    }

    setSelectionCorrectness(index: number): boolean {
        this.model.setDisplay(index, "correctness");
        this.stateUpdated();
        return this.model.displayWords[index] === "wrong";
    }
}
