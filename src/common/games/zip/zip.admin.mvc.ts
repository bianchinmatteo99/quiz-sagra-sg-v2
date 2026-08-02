import { delay, Secret } from "../../general.utils";
import { GameController, GameControllerContext, GameModel, GameModelContext, GameView, GameViewContext } from "../games.admin.base";
import { ZipGameDefinition } from "./zip.admin.definition";
import { CatenaGameStateSnapshot as ZipGameStateSnapshot, ZipGameRequiredData, ZipState } from "./zip.contracts";

export class ZipGameModel extends GameModel<ZipGameDefinition, ZipGameStateSnapshot> {
    definition: ZipGameDefinition;
    state: ZipState;
    currentZip: number;
    currentZipLetters: number;
    timeForAnswer: number;
    canRetryForSameZip: boolean;
    pointsForCorrectAnswer: number;

    constructor(ctx: GameModelContext, def: ZipGameDefinition) {
        super(ctx);
        this.definition = def;
        this.state = ZipState.STARTING;
        this.currentZip = -1;
        this.currentZipLetters = 0;
        this.timeForAnswer = def.data.timeForAnswer;
        this.canRetryForSameZip = def.data.canRetryForSameZip;
        this.pointsForCorrectAnswer = def.data.pointsForCorrectAnswer;
    }

    getZip(i: number): string[]|null {
        if(i in this.definition.data.zips){
            return this.definition.data.zips[i]
        } else {
            return null;
        }
    }
    getCurrentZip(): string[]|null {
        return this.getZip(this.currentZip)
    }
    getCurrentZipAsSecret(): Secret<string[]>|null{
        const z = this.getCurrentZip();
        if(!z) return null;
        return new Secret(z, (clearValue)=> {
            return [
                clearValue.at(0) ?? "",
                ... clearValue.slice(1,-1).map((w)=>w.slice(0, this.currentZipLetters) + (this.currentZipLetters>=w.length ? "" : "***")),
                clearValue.at(-1) ?? ""
            ]
        });
    }

    parseFromJSON(data: Partial<ZipGameStateSnapshot>): boolean {
        this.state = data.state ?? ZipState.STARTING;
        this.currentZip = data.currentZip ?? -1;
        this.currentZipLetters = data.currentZipLetters ?? 0;
        this.timeForAnswer = data.timeForAnswer ?? this.definition.data.timeForAnswer;
        this.canRetryForSameZip = data.canRetryForSameZip ?? this.definition.data.canRetryForSameZip;
        this.pointsForCorrectAnswer = data.pointsForCorrectAnswer ?? this.definition.data.pointsForCorrectAnswer;
        return true;
    }

    toJSON(): ZipGameStateSnapshot {
        return {
            ...ZipGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            currentZip: this.currentZip,
            currentZipLetters: this.currentZipLetters,
            timeForAnswer: this.timeForAnswer,
            canRetryForSameZip: this.canRetryForSameZip,
            pointsForCorrectAnswer: this.pointsForCorrectAnswer,
            displayWords: this.getCurrentZipAsSecret()?.read() ?? []
        };
    }
}

export interface ZipGameViewContext extends GameViewContext<ZipGameDefinition> {
    model: ZipGameModel;
}

export class ZipGameView extends GameView {
    activeGameContext: ZipGameViewContext | null;
    gameDef: ZipGameDefinition;

    constructor(ctx: ZipGameViewContext | null = null, gameDef: ZipGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        this.gameDef = this.readDefinition(ctx, gameDef);
    }

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.data.zips.map((zip, index) => ((s: boolean) => `Zip ${index + 1}: ${s ? zip.join(", ") : "***"}`)),
            "Conclusione",
        ];
    }

    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        if (this.activeGameContext.model.state == ZipState.STARTING || this.activeGameContext.model.state == ZipState.DISPLAYCOVER) {
            return 0;
        }
        if (this.activeGameContext.model.state == ZipState.ENDING) {
            return this.getSteps().length - 1;
        }
        return this.activeGameContext.model.currentZip + 1;
    }

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const showSecrets = this.canDisplaySecrets();

        container.innerHTML = `
            Titolo: ${this.activeGameContext.model.definition.data.title}<br/>
            Stato: ${this.activeGameContext.model.state}<br/>
            Zip corrente: ${this.activeGameContext.model.currentZip + 1} di ${this.gameDef.data.zips.length}<br/>
            Lettere zip: ${this.activeGameContext.model.currentZipLetters}<br/>
            Parole visualizzate: ${(showSecrets ? this.gameDef.data.zips[this.activeGameContext.model.currentZip] : this.activeGameContext.model.getCurrentZipAsSecret()?.read()??[]).join(", ")}<br/>
            Punti per risposta: ${this.gameDef.data.pointsForCorrectAnswer}<br/>
            Tempo per risposta: ${this.gameDef.data.timeForAnswer}<br/>
            Riprova stesso zip: ${this.gameDef.data.canRetryForSameZip ? "Sì" : "No"}
        `;
    }
}

export class ZipGameController extends GameController implements ZipGameViewContext {
    model: ZipGameModel;
    view: ZipGameView;

    constructor(ctx: GameControllerContext, def: ZipGameDefinition) {
        super(ctx);
        this.model = new ZipGameModel(this, def);
        this.view = new ZipGameView(this);
    }

    nextWord() : boolean{
        const next = this.model.currentZip+1;
        const nextw = this.model.getZip(next);
        if(!!nextw) {
            this.model.currentZip = next;
            this.model.currentZipLetters = 0;
            this.stateUpdated();
            return true;
        } else {
            return false;
        }
    }
    
    async nextLetter(transitionT: number = 0): Promise<boolean>{
        const z = this.model.getCurrentZip()!;
        const limit = Math.min(...z.slice(1,-1).map((w)=>w.length))-1
        if(this.model.currentZipLetters < limit){
            this.model.currentZipLetters+=1;
            this.stateUpdated();
            await delay(transitionT);
            return true;
        } else if (this.model.currentZipLetters==limit){
            await this.completeZip(transitionT);
            return false;
        } else {
            return false;
        }
    }

    
    async completeZip(transitionT : number = 0): Promise<void>{
        this.model.currentZipLetters = Math.max(...this.model.getCurrentZip()!.map((w)=>w.length));
        this.stateUpdated();
        await delay(transitionT);
    }

    setState(s: ZipState): void {
        this.model.state = s;
        this.stateUpdated();
    }
}