import { ReazioneCatenaGameDefinition, ReazioneCatenaGameDefinitionBuilder } from "./catena/catena.definition";
import { ReazioneCatenaGameManager } from "./catena/catena.manager";
import { ReazioneCatenaGameView } from "./catena/catena.view";
import { GameDefinition, GameDefinitionBuilder, GameManager, GameManagerContext, GameView } from "./game.base";

/**
 * Registry of game definition builders keyed by the game type name.
 *
 * Each registered builder is responsible for parsing the game definition
 * from Markdown or JSON during quiz initialization and state restoration.
 * The key must match the game `name` returned by the concrete definition.
 */
export const gamesDefBuilders: { [key: string]: GameDefinitionBuilder<GameDefinition>; } = {
    "catena": new ReazioneCatenaGameDefinitionBuilder(),
};


/**
 * Factory helper that creates a concrete `GameManager` for a parsed game definition.
 *
 * This is used when the quiz starts or when the system restores a running game
 * from persisted state. The `restoreState` flag is forwarded to the manager so it
 * can decide whether to restore existing runtime state or start fresh.
 */
export function instantiateGameManagerFor(def: GameDefinition, ctx: GameManagerContext, restoreState : boolean = false): GameManager{
    switch(def.name){
        case "catena":
            return new ReazioneCatenaGameManager(ctx, def as ReazioneCatenaGameDefinition, restoreState);
        
        default:
            throw new Error("Game type " + def.name + " not registered.")
    }
}

/**
 * Factory helper that creates a concrete `GameView` for a game definition.
 *
 * This view is intended to be used in static timeline mode.
 */
export function instantiateGameViewerFor(def: GameDefinition): GameView{
    switch(def.name){
        case "catena":
            return new ReazioneCatenaGameView(null, def as ReazioneCatenaGameDefinition);
        
        default:
            throw new Error("Game type " + def.name + " not registered.")
    }
}