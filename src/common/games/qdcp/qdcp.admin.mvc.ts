import { delay, Secret } from "../../general.utils";
import { GameController, GameControllerContext, GameModel, GameModelContext, GameView, GameViewContext } from "../games.admin.base";
import { QDCPGameDefinition } from "./qdcp.admin.definition";
import { QDCPGameRequiredData, QDCPGameStateSnapshot, QDCPState } from "./qdcp.contracts";

export class QDCPGameModel extends GameModel<QDCPGameDefinition, QDCPGameStateSnapshot> {
    definition: QDCPGameDefinition;
    state: QDCPState;
    currentIndex: number;
    currentSection: number;
    
    limitTrialsPerSection: number;
    stopWhenFirstHandIsRaised: boolean;
    pointsForCorrectAnswer: number;

    constructor(ctx: GameModelContext, def: QDCPGameDefinition) {
        super(ctx);
        this.definition = def;
        this.state = QDCPState.STARTING;
        this.currentIndex = -1;
        this.currentSection = 0;
        
        this.limitTrialsPerSection = def.data.limitTrialsPerSection;
        this.stopWhenFirstHandIsRaised = def.data.stopWhenFirstHandRaised;
        this.pointsForCorrectAnswer = def.data.pointsForCorrectAnswer;
    }

    parseFromJSON(data: Partial<QDCPGameStateSnapshot>): boolean {
        this.state = data.state ?? QDCPState.STARTING;
        this.currentIndex = data.currentIndex ?? -1;
        this.currentSection = data.currentSection ?? 0;
        this.limitTrialsPerSection = data.limitTrialsPerSection ?? this.definition.data.limitTrialsPerSection;
        this.stopWhenFirstHandIsRaised = data.stopWhenFirstHandIsRaised ?? this.definition.data.stopWhenFirstHandRaised;
        this.pointsForCorrectAnswer = data.pointsForCorrectAnswer ?? this.definition.data.pointsForCorrectAnswer;
        return true;
    }

    getEntry(i: number): string[] | null {
        if (i in this.definition.data.hintsAndAnswers) {
            return this.definition.data.hintsAndAnswers[i]!;
        }
        return null;
    }

    getHints(i: number): string[] | null {
        return this.getEntry(i)?.slice(0,-1) ?? null;
    }

    getCorrectAnswer(i: number): string | null {
        return this.getEntry(i)?.at(-1) ?? null;
    }


    getCurrentCorrectAnswer(): string | null {
        return this.getCorrectAnswer(this.currentIndex);
    }
    getCurrentEntry(): string[] | null{
        return this.getEntry(this.currentIndex);
    }
    getCurrentDisplayEntry(): string[]{
        return this.getCurrentEntry()?.slice(0,this.currentSection) ?? []
    }

    toJSON(): QDCPGameStateSnapshot {
        return {
            ...QDCPGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            currentIndex: this.currentIndex,
            currentSection: this.currentSection,
            displayContents: this.getCurrentDisplayEntry(),
            limitTrialsPerSection: this.limitTrialsPerSection,
            stopWhenFirstHandIsRaised: this.stopWhenFirstHandIsRaised,
            pointsForCorrectAnswer: this.pointsForCorrectAnswer,
        };
    }
}

export interface QDCPGameViewContext extends GameViewContext<QDCPGameDefinition> {
    model: QDCPGameModel;
}

export class QDCPGameView extends GameView {
    activeGameContext: QDCPGameViewContext | null;
    gameDef: QDCPGameDefinition;

    constructor(ctx: QDCPGameViewContext | null = null, gameDef: QDCPGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        this.gameDef = this.readDefinition(ctx, gameDef);
    }

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.data.hintsAndAnswers.map((entry, index) => (
                (s: boolean) => `Sezione ${index + 1}: ${s ? entry.join(" | ") : "***"}`
            )),
            "Conclusione",
        ];
    }

    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        const stepCount = this.getSteps().length;

        switch (this.activeGameContext.model.state) {
            case QDCPState.DISPLAYCOVER:
                if (this.activeGameContext.model.currentIndex < 0) {
                    return 0;
                }
            case QDCPState.ASKINGQUESTION:
                return 1 + this.activeGameContext.model.currentIndex;
            case QDCPState.ENDING:
                return stepCount - 1;
            default:
                return 0;
        }
    }

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const showSecrets = this.canDisplaySecrets();
        const currentEntry = this.activeGameContext.model.getCurrentEntry() ?? [];
        const displayedEntry = this.activeGameContext.model.getCurrentDisplayEntry()
        let entry = ""
        if(currentEntry.length>0){
            let sep = [""," | "," | "," | "," = "]
            for(let i=0; i<5; i++){
                let x = "";
                if(i in displayedEntry){
                    x = displayedEntry[i]!
                } else if(showSecrets) {
                    x = currentEntry[i] ?? "???"
                } else {
                    x = "***"
                }
                entry += sep[i] + x;
            }
        }
        
        container.innerHTML = `
            Titolo: ${this.activeGameContext.model.definition.data.title}<br/>
            Stato: ${this.activeGameContext.model.state}<br/>
            Hint e risposta correnti: ${entry}<br/>
            Tentativi limite: ${this.activeGameContext.model.limitTrialsPerSection}<br/>
            Stop alla prima mano alzata: ${this.activeGameContext.model.stopWhenFirstHandIsRaised ? "Sì" : "No"}<br/>
            Punti per risposta: ${this.activeGameContext.model.pointsForCorrectAnswer}
        `;
    }
}

export class QDCPGameController extends GameController implements QDCPGameViewContext {
    model: QDCPGameModel;
    view: QDCPGameView;

    constructor(ctx: GameControllerContext, def: QDCPGameDefinition) {
        super(ctx);
        this.model = new QDCPGameModel(this, def);
        this.view = new QDCPGameView(this);
    }

    nextEntry(): boolean {
        const next = this.model.currentIndex + 1;
        const nextEntry = this.model.getEntry(next);
        if (!!nextEntry) {
            this.model.currentIndex = next;
            this.model.currentSection = 0;
            this.stateUpdated();
            return true;
        }
        return false;
    }

    nextHintSection(): boolean {
        const next = this.model.currentSection + 1;
        if(next < 5){
            this.model.currentSection = next;
            this.stateUpdated();
            return true;
        }
        return false;
    }

    async displayCorrectWord(): Promise<void> {
        while(this.model.currentSection<5){
            this.model.currentSection++;
            this.stateUpdated();
            await delay(2000)
        }
    }

    setState(state: QDCPState): void {
        this.model.state = state;
        this.stateUpdated();
    }
}
