import { Secret } from "../../general.utils";
import { GameController, GameControllerContext, GameModel, GameModelContext, GameView, GameViewContext } from "../games.admin.base";
import { GuessWordGameDefinition } from "./guess_word.admin.definition";
import { GuessWordGameRequiredData, GuessWordGameStateSnapshot, GuessWordState } from "./guess_word.contract";

function popRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;

  const i = Math.floor(Math.random() * arr.length);
  const value = arr[i];

  arr[i] = arr[arr.length - 1]; // Move last element into the gap
  arr.pop();

  return value;
}
class HoleText extends Secret<string> {
    mask: boolean[]
    exploded: string[]
    missingLetters: string[]
    ismultiword: boolean
    get obfuscated() {
        return this.exploded.entries().map(([i, l])=>this.mask[i] ? l : "*").toArray().join("");
    }
    constructor(clearWord: string, pattern?:string){
        clearWord = clearWord.trim()
        super(clearWord, ()=>this.obfuscated);
        this.exploded = clearWord.toUpperCase().split("");
        this.ismultiword = clearWord.split(" ").length > 1
        this.missingLetters = []
        if(pattern){
            this.mask = pattern.split("").map((l)=>l!=="*")
        } else {
            this.mask = this.exploded.map(()=>false);
            this.setupMask()
        }
        this.updateMissingLetters();
    }
    displayAll(){
        this.mask = this.exploded.map(() => true);
        this.missingLetters = [];
    }
    setupMask(){
        this.exploded.forEach((letter, index) => {
            const plainLetter = this.toPlainUppercaseLetter(letter);
            if (this.isPlainAlphabeticLetter(plainLetter)) {
                this.mask[index] = false;
            } else {
                this.mask[index] = true;
            }
        });
    }

    private toPlainUppercaseLetter(letter: string): string {
        return letter
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
    }

    private isPlainAlphabeticLetter(letter: string): boolean {
        return /^[A-Z]$/.test(letter);
    }

    private updateMissingLetters() {
        const letters : string[] = [];

        this.exploded.forEach((letter) => {
            const plainLetter = this.toPlainUppercaseLetter(letter);
            if (this.isPlainAlphabeticLetter(plainLetter)) {
                letters.push(plainLetter);
            }
        });

        this.missingLetters = letters;
    }

    displayRandomLetter(displaySameLetterPolicy: "separate"|"together"|"default"): boolean{
        if(displaySameLetterPolicy==="together"||(displaySameLetterPolicy==="default" && this.ismultiword)){
            const l = popRandom(this.missingLetters)
            if(l){
                this.exploded.forEach((letter, index) => {
                    if (this.toPlainUppercaseLetter(letter) === l) {
                        this.mask[index] = true;
                    }
                });
                return this.missingLetters.length>1;
            } else {
                return false;
            }
        } else {
            const i = popRandom(this.mask.map((m, i)=>m ? -1 : i).filter((v)=>v >= 0))
            if(i!==undefined){
                this.mask[i] = true;
                this.updateMissingLetters();
                return this.mask.reduce((total, value) => total + (value ? 0 : 1), 0) > 1;
            } else {
                return false;
            }
        }
    }
}

export class GuessWordGameModel extends GameModel<GuessWordGameStateSnapshot> {
    definition: GuessWordGameDefinition;
    state: GuessWordState;
    private _currentWordIndex: number = -1;
    get currentWordIndex(){
        return this._currentWordIndex
    }
    set currentWordIndex(i){
        const w = this.getWord(i);
        this.displayWord = w ? new HoleText(w) : null;
        this._currentWordIndex = w ? i : -1;
    }
    displayWord: HoleText|null;
    stopAtFirstCorrectAnswer: boolean;
    pointsForCorrectAnswer: number;
    delayBetweenLetterDisplay: number | false;
    sameLettersPolicy: "separate" | "together" | "default";

    constructor(ctx: GameModelContext, def: GuessWordGameDefinition) {
        super(ctx);
        this.definition = def;
        this.state = GuessWordState.STARTING;
        this.currentWordIndex = -1;
        this.displayWord = null;
        this.stopAtFirstCorrectAnswer = def.data.stopAtFirstCorrectAnswer;
        this.pointsForCorrectAnswer = def.data.pointsForCorrectAnswer;
        this.delayBetweenLetterDisplay = def.data.delayBetweenLetterDisplay;
        this.sameLettersPolicy = def.data.sameLettersPolicy;
    }

    parseFromJSON(data: Partial<GuessWordGameStateSnapshot>): boolean {
        this.state = data.state ?? GuessWordState.STARTING;
        this.currentWordIndex = data.currentWordIndex ?? -1;
        const w = this.getCurrentWord();
        this.displayWord = w ? new HoleText(w, data.displayWord) : null;
        this.stopAtFirstCorrectAnswer = data.stopAtFirstCorrectAnswer ?? this.definition.data.stopAtFirstCorrectAnswer;
        this.pointsForCorrectAnswer = data.pointsForCorrectAnswer ?? this.definition.data.pointsForCorrectAnswer;
        this.delayBetweenLetterDisplay = data.delayBetweenLetterDisplay ?? this.definition.data.delayBetweenLetterDisplay;
        this.sameLettersPolicy = data.sameLettersPolicy ?? this.definition.data.sameLettersPolicy;
        return true;
    }

    getWord(i: number): string | null {
        if (i in this.definition.data.correctAnswers) {
            return this.definition.data.correctAnswers[i];
        }
        return null;
    }

    getWordAsSecret(i: number): Secret<string> | null {
        const word = this.getWord(i);
        if (!word) return null;
        return this.displayWord;
    }

    getCurrentWord(): string | null {
        return this.getWord(this.currentWordIndex);
    }

    toJSON(): GuessWordGameStateSnapshot {
        return {
            ...GuessWordGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            currentWordIndex: this.currentWordIndex,
            displayWord: this.displayWord?.read() ?? "",
            stopAtFirstCorrectAnswer: this.stopAtFirstCorrectAnswer,
            pointsForCorrectAnswer: this.pointsForCorrectAnswer,
            delayBetweenLetterDisplay: this.delayBetweenLetterDisplay,
            sameLettersPolicy: this.sameLettersPolicy,
        };
    }
}

export interface GuessWordGameViewContext extends GameViewContext {
    model: GuessWordGameModel;
}

export class GuessWordGameView extends GameView {
    activeGameContext: GuessWordGameViewContext | null;
    gameDef: GuessWordGameDefinition;

    constructor(ctx: GuessWordGameViewContext | null = null, gameDef: GuessWordGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        if (!!ctx) {
            this.gameDef = ctx.model.definition;
        } else if (!!gameDef) {
            this.gameDef = gameDef;
        } else {
            throw new Error("Unable to instantiate the game if no gameDef is provided, neither directly or in context");
        }
    }

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.data.correctAnswers.map((word, index) => ((s: boolean) => `Parola ${index + 1}: ${s ? word : "***"}`)),
            "Conclusione",
        ];
    }

    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        if (this.activeGameContext.model.state === GuessWordState.STARTING || this.activeGameContext.model.state === GuessWordState.DISPLAYCOVER) {
            return 0;
        }
        if (this.activeGameContext.model.state === GuessWordState.ENDING) {
            return this.getSteps().length - 1;
        }
        if (this.activeGameContext.model.currentWordIndex < 0) {
            return 0;
        }
        return this.activeGameContext.model.currentWordIndex + 1;
    }

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const showSecrets = this.canDisplaySecrets();
        const currentWord = this.activeGameContext.model
            .getWordAsSecret(this.activeGameContext.model.currentWordIndex)
            ?.read(showSecrets) ?? "?";

        container.innerHTML = `
            Titolo: ${this.activeGameContext.model.definition.data.title}<br/>
            Stato: ${this.activeGameContext.model.state}<br/>
            Parola corrente: ${this.activeGameContext.model.currentWordIndex + 1} di ${this.gameDef.data.correctAnswers.length}<br/>
            Risposta corretta: ${currentWord}<br/>
            Stop alla prima risposta corretta: ${this.activeGameContext.model.stopAtFirstCorrectAnswer ? "Sì" : "No"}<br/>
            Punti per risposta: ${this.activeGameContext.model.pointsForCorrectAnswer}<br/>
            Delay lettere: ${this.activeGameContext.model.delayBetweenLetterDisplay === false ? "manuale" : `${this.activeGameContext.model.delayBetweenLetterDisplay}s`}<br/>
            Regola lettere uguali: ${this.activeGameContext.model.sameLettersPolicy}
        `;
    }
}

export class GuessWordGameController extends GameController implements GuessWordGameViewContext {
    model: GuessWordGameModel;
    view: GuessWordGameView;

    constructor(ctx: GameControllerContext, def: GuessWordGameDefinition) {
        super(ctx);
        this.model = new GuessWordGameModel(this, def);
        this.view = new GuessWordGameView(this);
    }

    nextWord(): boolean {
        const next = this.model.currentWordIndex + 1;
        const nextWord = this.model.getWord(next);
        if (!!nextWord) {
            this.model.currentWordIndex = next;
            this.stateUpdated();
            return true;
        }
        return false;
    }

    nextRandomLetter(): boolean|null {
        const r = this.model.displayWord?.displayRandomLetter(this.model.sameLettersPolicy) ?? null;
        this.stateUpdated();
        return r;
    }

    completeWord() {
        this.model.displayWord?.displayAll();
        this.stateUpdated();
    }

    setState(state: GuessWordState): void {
        this.model.state = state;
        this.stateUpdated();
    }
}
