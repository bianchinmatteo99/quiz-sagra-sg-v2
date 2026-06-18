import { getDatabase } from "firebase/database";
import { IDatabaseAdapter } from "../database/database.types.old";
import { BaseModel, BaseModelContext } from "../general.interfaces";

export abstract class GameDefinition {
    abstract readonly name: string;
    abstract toJSON(): any;
    readonly id: number;
    constructor(id: number){
        this.id = id;
    }
}

export interface GameDefinitionBuilder<T extends GameDefinition> {
    parseFromMD(id: number, md: string): T;
    parseFromJSON(id: number, data: any): T;
}

export interface GameModelContext extends BaseModelContext {
    
}

// TODO ADD SECRET DB PATH HANDLING
export abstract class GameModel extends BaseModel {
    readonly DBPATH = "/state/game";
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
    isDisplayingLiveTimeline: boolean = false;
    abstract activeGameContext: GameViewContext | null;
    
    shouldRenderTimeline(): boolean {
        return !this.activeGameContext || this.isDisplayingLiveTimeline;
    }
    shouldRenderCurrentState(): boolean {
        return !!this.activeGameContext;
    }
    setIsDisplayingLiveTimeline(isLive: boolean): void {
        this.isDisplayingLiveTimeline = isLive;
    }

    render(){
        if(this.shouldRenderTimeline()) {
            const container = document.getElementById(this.timelineContainer);
            if(!container) return;
            this.renderTimeline(container);
        }
        if(this.shouldRenderCurrentState()) {
            const container = document.getElementById(this.currentStateContainer);
            if(!container) return;
            this.renderCurrentState(container)
        }
    }

    abstract renderTimeline(container : HTMLElement): void;
    abstract renderCurrentState(container : HTMLElement): void;
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

    stateUpdated(remote : boolean = false): void {
        if(!remote) this.model.saveToDatabase();
        this.view.render();
    }
}

export interface GameManagerContext {
    getDatabase(): IDatabaseAdapter;
    updateRanking(ranking: any): void;
    notifyGameEnd(game: GameDefinition): void;
}

export abstract class GameManager implements GameControllerContext {
    context: GameManagerContext;

    abstract controller: GameController;

    constructor(ctx: GameManagerContext) {
        this.context = ctx;
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    abstract startGame(): void;
    abstract endGame(): void;
}