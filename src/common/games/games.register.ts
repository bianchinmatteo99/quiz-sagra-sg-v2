import { ReazioneCatenaGameDefinition, ReazioneCatenaGameDefinitionBuilder } from "./catena/catena.definition";
import { ReazioneCatenaGameManager } from "./catena/catena.manager";
import { ReazioneCatenaGameView } from "./catena/catena.view";
import { GameDefinition, GameDefinitionBuilder, GameManager, GameManagerContext, GameView } from "./game.base";

export const gamesDefBuilders: { [key: string]: GameDefinitionBuilder<GameDefinition>; } = {
    "catena": new ReazioneCatenaGameDefinitionBuilder(),
};


export function instantiateGameManagerFor(def: GameDefinition, ctx: GameManagerContext, restoreState : boolean = false): GameManager{
    switch(def.name){
        case "catena":
            return new ReazioneCatenaGameManager(ctx, def as ReazioneCatenaGameDefinition, restoreState);
        
        default:
            throw new Error("Game type " + def.name + " not registered.")
    }
}

export function instantiateGameViewerFor(def: GameDefinition): GameView{
    switch(def.name){
        case "catena":
            return new ReazioneCatenaGameView(null, def as ReazioneCatenaGameDefinition);
        
        default:
            throw new Error("Game type " + def.name + " not registered.")
    }
}