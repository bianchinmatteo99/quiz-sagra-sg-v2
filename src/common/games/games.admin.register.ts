import { CatenaGameRequiredData } from "./catena/catena.contracts";
import { CatenaGameDefinition, CatenaGameDefinitionBuilder } from "./catena/catena.admin.definition";
import { CatenaGameManager } from "./catena/catena.admin.manager";
import { CatenaGameView } from "./catena/catena.admin.mvc";
import { GuessSongGameRequiredData } from "./guess_song/guess_song.contracts";
import { GuessSongGameDefinition, GuessSongGameDefinitionBuilder } from "./guess_song/guess_song.admin.definition";
import { GuessSongGameManager } from "./guess_song/guess_song.admin.manager";
import { GuessSongGameView } from "./guess_song/guess_song.admin.mvc";
import { AnyGameDefinition, GameDefinitionBuilder, GameManager, GameManagerContext, GameView } from "./games.admin.base";
import { AnyGameDefinitionData } from "./games.contracts";

/**
 * Registry of game definition builders keyed by game kind.
 *
 * `QuizDefinitionBuilder` resolves each game section/header kind and uses this
 * map to parse either Markdown (`parseFromMD`) or persisted JSON
 * (`parseFromJSON`) into a concrete `GameDefinitionData` payload.
 *
 * Keys must match the `kind` discriminator used by runtime definitions and
 * snapshots, otherwise parsing fails with an unknown-game error.
 */
export const gamesDefBuilders: { [key: string]: GameDefinitionBuilder<AnyGameDefinitionData>; } = {
    [CatenaGameRequiredData.kind]: new CatenaGameDefinitionBuilder(),
    [GuessSongGameRequiredData.kind]: new GuessSongGameDefinitionBuilder(),
};


/**
 * Create the concrete runtime manager for a game definition.
 *
 * Called by `QuizManager.startGame()` after a game is selected from the loaded
 * quiz definition. When `restoreState` is true, the created manager is expected
 * to load runtime state from database-backed model paths.
 *
 * @param def Parsed game definition selected by the quiz flow.
 * @param ctx Host context implemented by `QuizManager`.
 * @param restoreState Whether the game should restore persisted runtime state.
 * @returns A concrete manager for `def.kind`.
 * @throws Error When `def.kind` has no registered runtime manager.
 */
export function instantiateGameManagerFor(def: AnyGameDefinition, ctx: GameManagerContext, restoreState : boolean = false): GameManager{
    switch(def.kind){
        case CatenaGameRequiredData.kind:
            return new CatenaGameManager(ctx, def as CatenaGameDefinition, restoreState);
        case GuessSongGameRequiredData.kind:
            return new GuessSongGameManager(ctx, def as GuessSongGameDefinition, restoreState);
        
        default:
            throw new Error("Game type " + def.kind + " not registered.")
    }
}

/**
 * Create a concrete game view for static timeline rendering.
 *
 * Used by the admin quiz controller when previewing a game different from the
 * currently active one. The view is created without an active controller
 * context and is expected to render timeline/definition data only.
 *
 * @param def Parsed game definition to visualize.
 * @returns A concrete view for `def.kind`.
 * @throws Error When `def.kind` has no registered view implementation.
 */
export function instantiateGameViewerFor(def: AnyGameDefinition): GameView{
    switch(def.kind){
        case CatenaGameRequiredData.kind:
            return new CatenaGameView(null, def as CatenaGameDefinition);
        case GuessSongGameRequiredData.kind:
            return new GuessSongGameView(null, def as GuessSongGameDefinition);
        
        default:
            throw new Error("Game type " + def.kind + " not registered.")
    }
}