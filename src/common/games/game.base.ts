import { getDatabase } from "firebase/database";
import { IDatabaseAdapter } from "../database/database.types.old";
import { BaseModel } from "../general.interfaces";

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

export interface GameModelContext {
    getDatabase(): IDatabaseAdapter;
}

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
    readonly timelineContainer = "#game-timeline";
    readonly currentStateContainer = "#game-current-state";
    isDisplayingLiveTimeline: boolean = false;
    activeGameContext: GameViewContext | null;
    constructor(ctx: GameViewContext | null) {
        this.activeGameContext = ctx;
    }

    shouldRenderTimeline(): boolean {
        return !this.activeGameContext || this.isDisplayingLiveTimeline;
    }
    shouldRenderCurrentState(): boolean {
        return !!this.activeGameContext;
    }
    setIsDisplayingLiveTimeline(isLive: boolean): void {
        this.isDisplayingLiveTimeline = isLive;
    }

    abstract renderTimeline(): void;
    abstract renderCurrentState(): void;
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
}

export interface GameManagerContext {
    updateRanking(ranking: any): void;
    notifyGameEnd(game: GameDefinition): void;
}

export abstract class GameManager {
    context: GameManagerContext;
    abstract definition: GameDefinition;
    abstract controller: GameController;

    constructor(ctx: GameManagerContext) {
        this.context = ctx;
    }
    abstract startGame(): void;
    abstract endGame(): void;
}