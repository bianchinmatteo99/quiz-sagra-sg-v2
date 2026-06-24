import { getDatabase } from "firebase/database";
import { IDatabaseAdapter } from "../database/database.types.old";
import { BaseModel, BaseModelContext, toHtml } from "../general.utils";
import { Person } from "../people/people.model";
import { QuestionContext } from "../questions/question.base";
import { RankingDiff } from "../people/people.controller";

export abstract class GameDefinition {
    abstract readonly name: string;
    abstract readonly displayName: string;
    abstract toJSON(): any;
    readonly id: number;
    constructor(id: number) {
        this.id = id;
    }
}

export interface GameDefinitionBuilder<T extends GameDefinition> {
    parseFromMD(id: number, md: string): T;
    parseFromJSON(id: number, data: any): T;
}

export interface GameModelContext extends BaseModelContext {

}

export abstract class GameModel extends BaseModel {
    readonly DBPATH = "/state/game";
    protected readonly SECRETSPATH = "/game";
    abstract definition: GameDefinition;

    context: GameModelContext;

    constructor(ctx: GameModelContext) {
        super();
        this.context = ctx;
    }

}

export interface GameViewContext {

}

export abstract class GameView {
    readonly timelineContainer = "game-timeline";
    readonly currentStateContainer = "game-current-state";
    readonly currentStateContent = "game-current-state-content"
    isDisplayingTimeline: boolean = false;
    abstract activeGameContext: GameViewContext | null;
    abstract gameDef: GameDefinition;

    private listenerController = new AbortController();
    constructor(){
        (document.getElementById("mostra-segreti") as HTMLInputElement).addEventListener("change", (e) => this.render(), { signal: this.listenerController.signal })
    }

    shouldRenderTimeline(): boolean {
        return this.isDisplayingTimeline;
    }
    shouldRenderCurrentState(): boolean {
        return !!this.activeGameContext;
    }
    canDisplaySecrets(): boolean{
        return (document.getElementById("mostra-segreti") as HTMLInputElement).checked;
    }
    setIsDisplayingTimeline(bool: boolean): void {
        this.isDisplayingTimeline = bool;
        if(bool){
            this.render();
        } else {
            this.clearTimeline();
        }
    }

    render() {
        if (this.shouldRenderTimeline()) {
            const container = document.getElementById(this.timelineContainer);
            if (!container) return;
            this.renderTimeline(container);
        }
        if (this.shouldRenderCurrentState()) {
            const container = document.getElementById(this.currentStateContent);
            if (!container) return;
            this.renderCurrentState(container)
        }
    }

    renderTimeline(container: HTMLElement): void {
        const islive = !!this.activeGameContext;
        const curr = this.getCurrentStep() ?? Infinity;
        const s = this.canDisplaySecrets();
        const getState = (i:number) => (islive ? (i == curr ? "current" : (i < curr ? "past" : "future")) : null);
        const steps = this.getSteps().entries().map(([i,step])=>{
            if(typeof step == "string"){
                return {title: step, state: getState(i)};
            } else {
                return {title: step(!islive || i<curr || s), state: getState(i)}
            }
        }).toArray();

        const stepHtmlBuilder = (step: {title: string, state: string|null}) => `
        <article class="game-steps-list-item ${step.state == "current" ? "active" : ""}">${step.title}</article>
        `;

        container.innerHTML = steps.map(stepHtmlBuilder).join("\n")
    }

    abstract renderCurrentState(container: HTMLElement): void;
    abstract getSteps(): (string | ((s:boolean)=>string))[];
    abstract getCurrentStep(): number|null;

    private _activeFooter: HTMLElement & { safeRemove: (result: boolean | null) => void } | null = null;
    renderFooterChoice(options: { advanceBtn: string, otherBtn?: string }, listener: (action: boolean | null) => void) {
        const container = document.getElementById(this.currentStateContainer);
        if (!!this._activeFooter) {
            this._activeFooter.safeRemove(null);
        }

        const element = toHtml(`
                <footer>
                    <div role="group">
                        ${!!options.otherBtn ? "<button class='game-admin-interaction-other contrast'>"+options.otherBtn+"</button>" : ""}
                        <button class="game-admin-interaction-advance active">${options.advanceBtn} <span class='material-symbols-outlined'>arrow_forward</span></button>
                    </div>
                </footer>
        `) as HTMLElement & { safeRemove: (result: boolean | null) => void };
        element.safeRemove = (result: boolean | null) => {
            if (this._activeFooter !== element) return; // guard against stale handlers
            element.remove();
            this._activeFooter = null;
            listener(result);
        };

        const advanceButton = element.querySelector(".game-admin-interaction-advance");
        advanceButton?.addEventListener("click", (event) => {
            event.stopPropagation();
            element.safeRemove(true);
        });
        if (!!options.otherBtn) {
            const otherButton = element.querySelector(".game-admin-interaction-other");
            otherButton?.addEventListener("click", (event) => {
                event.stopPropagation();
                element.safeRemove(false);
            });
        }
        
        this._activeFooter = element;
        container?.appendChild(element);
    }

    clearTimeline(){
        (document.getElementById(this.timelineContainer) as HTMLElement).innerHTML = "";
    }
    clearCurrentState(){
        (document.getElementById(this.currentStateContent)as HTMLElement).innerHTML = "";;
        if(!!this._activeFooter) this._activeFooter.safeRemove(null);
    }
    clearViews(){
        this.listenerController.abort();
        if(this.shouldRenderCurrentState()){
            this.clearCurrentState();
        }
        if(this.shouldRenderTimeline()){
            this.clearTimeline();
        }
    }
}

export interface GameControllerContext {
    getDatabase(): IDatabaseAdapter;
}
export abstract class GameController implements GameViewContext, GameModelContext {
    context: GameControllerContext;
    abstract model: GameModel;
    abstract view: GameView;
    constructor(ctx: GameControllerContext) {
        this.context = ctx;
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        this.view.render();
    }

    async adminInteraction(options: {advanceBtn: string, otherBtn?: string}): Promise<boolean>{
        return new Promise((resolve, reject)=>{
            this.view.renderFooterChoice(options, (action)=>{
                if(action!==null){
                    resolve(action);
                } else {
                    reject();
                }
            })
        });
    }

    clearAll(){
        this.view.clearViews();
        this.model.clearDatabase();
    }
}

export interface GameManagerContext {
    getDatabase(): IDatabaseAdapter;
    updateRanking(diff: RankingDiff): void;
    getPeopleList(): Map<string, Person>;
}

export abstract class GameManager implements GameControllerContext, QuestionContext {
    context: GameManagerContext;

    abstract controller: GameController;

    constructor(ctx: GameManagerContext) {
        this.context = ctx;
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }
    getPeopleList(): Map<string, Person>{
        return this.context.getPeopleList();
    }

    abstract startGame(): Promise<void>;

    endGame(){
        this.controller.clearAll();
    }
}