import { CatenaGameDefinitionData } from "./catena/catena.contracts";
import { CatenaGameDefinition, CatenaGameDefinitionBuilder } from "./catena/catena.admin.definition";
import { CatenaGameManager } from "./catena/catena.admin.manager";
import { CatenaGameView } from "./catena/catena.admin.mvc";
import { GameDefinition, GameDefinitionBuilder, GameManager, GameManagerContext, GameView } from "./games.admin.base";
import { GameDefinitionData } from "./games.contracts";

/**
 * Registry of game definition builders keyed by the game type name.
 *
 * Each registered builder is responsible for parsing the game definition
 * from Markdown or JSON during quiz initialization and state restoration.
 * The key must match the game `kind` returned by the concrete definition.
 */
export const gamesDefBuilders: { [key: string]: GameDefinitionBuilder<GameDefinitionData>; } = {
    "catena": new CatenaGameDefinitionBuilder(),
};


/**
 * Factory helper that creates a concrete `GameManager` for a parsed game definition.
 *
 * This is used when the quiz starts or when the system restores a running game
 * from persisted state. The `restoreState` flag is forwarded to the manager so it
 * can decide whether to restore existing runtime state or start fresh.
 */
export function instantiateGameManagerFor(def: GameDefinition<GameDefinitionData>, ctx: GameManagerContext, restoreState : boolean = false): GameManager{
    switch(def.kind){
        case "catena":
            return new CatenaGameManager(ctx, def as CatenaGameDefinition, restoreState);
        
        default:
            throw new Error("Game type " + def.kind + " not registered.")
    }
}

/**
 * Factory helper that creates a concrete `GameView` for a game definition.
 *
 * This view is intended to be used in static timeline mode.
 */
export function instantiateGameViewerFor(def: GameDefinition<GameDefinitionData>): GameView{
    switch(def.kind){
        case "catena":
            return new CatenaGameView(null, def as CatenaGameDefinition);
        
        default:
            throw new Error("Game type " + def.kind + " not registered.")
    }
}