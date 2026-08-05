import { CatenaGameRequiredData } from "./catena/catena.contracts";
import { CatenaGameDefinition, CatenaGameDefinitionBuilder } from "./catena/catena.admin.definition";
import { CatenaGameManager } from "./catena/catena.admin.manager";
import { CatenaGameView } from "./catena/catena.admin.mvc";
import { GuessSongGameRequiredData } from "./guess_song/guess_song.contracts";
import { GuessSongGameDefinition as GuessSongGameDefinitionv2 } from "./tests.v2.guess_song"; // TESTING V2 - LINE WAS import { GuessSongGameDefinition, GuessSongGameDefinitionBuilder } from "./guess_song/guess_song.admin.definition";
import { GuessSongDefinitionBuilder as GuessSongDefinitionBuilderv2 } from "./tests.v2.guess_song"; // TESTING V2 - LINE WAS import { GuessSongGameDefinition, GuessSongGameDefinitionBuilder } from "./guess_song/guess_song.admin.definition";
import { GuessSongGameManager as GuessSongGameManagerv2 } from "./tests.v2.guess_song"; // TESTING V2 - LINE WAS import { GuessSongGameManager } from "./guess_song/guess_song.admin.manager";
import { GuessSongGameView as GuessSongGameViewv2 } from "./tests.v2.guess_song"; // TESTING V2 - LINE WAS import { GuessSongGameView } from "./guess_song/guess_song.admin.mvc";
import { OpenQuestionGameRequiredData } from "./open_question/open_question.contracts";
import { OpenQuestionGameDefinition, OpenQuestionGameDefinitionBuilder } from "./open_question/open_question.admin.definition";
import { OpenQuestionGameManager } from "./open_question/open_question.admin.manager";
import { OpenQuestionGameView } from "./open_question/open_question.admin.mvc";
import { GuessWordGameRequiredData } from "./guess_word/guess_word.contract";
import { GuessWordGameDefinition, GuessWordGameDefinitionBuilder } from "./guess_word/guess_word.admin.definition";
import { GuessWordGameManager } from "./guess_word/guess_word.admin.manager";
import { GuessWordGameView } from "./guess_word/guess_word.admin.mvc";
import { NumericEstimationGameRequiredData } from "./numeric_estimation/numeric_estimation.contracts";
import { NumericEstimationGameDefinition, NumericEstimationGameDefinitionBuilder } from "./numeric_estimation/numeric_estimation.admin.definition";
import { NumericEstimationGameManager } from "./numeric_estimation/numeric_estimation.admin.manager";
import { NumericEstimationGameView } from "./numeric_estimation/numeric_estimation.admin.mvc";
import { QDCPGameRequiredData } from "./qdcp/qdcp.contracts";
import { QDCPGameDefinition, QDCPGameDefinitionBuilder } from "./qdcp/qdcp.admin.definition";
import { QDCPGameManager } from "./qdcp/qdcp.admin.manager";
import { QDCPGameView } from "./qdcp/qdcp.admin.mvc";
import { ZipGameRequiredData } from "./zip/zip.contracts";
import { ZipGameDefinition, ZipGameDefinitionBuilder } from "./zip/zip.admin.definition";
import { ZipGameManager } from "./zip/zip.admin.manager";
import { ZipGameView } from "./zip/zip.admin.mvc";
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
    [GuessSongGameRequiredData.kind]: new GuessSongDefinitionBuilderv2() as unknown as GameDefinitionBuilder<AnyGameDefinitionData>, // TESTING V2 - LINE WAS     [GuessSongGameRequiredData.kind]: new GuessSongGameDefinitionBuilder(),
    [OpenQuestionGameRequiredData.kind]: new OpenQuestionGameDefinitionBuilder(),
    [GuessWordGameRequiredData.kind]: new GuessWordGameDefinitionBuilder(),
    [NumericEstimationGameRequiredData.kind]: new NumericEstimationGameDefinitionBuilder(),
    [QDCPGameRequiredData.kind]: new QDCPGameDefinitionBuilder(),
    [ZipGameRequiredData.kind]: new ZipGameDefinitionBuilder(),
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
            return new GuessSongGameManagerv2(ctx, def as unknown as GuessSongGameDefinitionv2, restoreState) as unknown as GameManager; // TESTING V2 - LINE WAS             return new GuessSongGameManager(ctx, def as GuessSongGameDefinition, restoreState);
        case OpenQuestionGameRequiredData.kind:
            return new OpenQuestionGameManager(ctx, def as OpenQuestionGameDefinition, restoreState);
        case GuessWordGameRequiredData.kind:
            return new GuessWordGameManager(ctx, def as GuessWordGameDefinition, restoreState);
        case NumericEstimationGameRequiredData.kind:
            return new NumericEstimationGameManager(ctx, def as NumericEstimationGameDefinition, restoreState);
        case QDCPGameRequiredData.kind:
            return new QDCPGameManager(ctx, def as QDCPGameDefinition, restoreState);
        case ZipGameRequiredData.kind:
            return new ZipGameManager(ctx, def as ZipGameDefinition, restoreState);
        
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
            return new GuessSongGameViewv2(null, def as unknown as GuessSongGameDefinitionv2) as unknown as GameView; // TESTING V2 - LINE WAS             return new GuessSongGameView(null, def as GuessSongGameDefinition);
        case OpenQuestionGameRequiredData.kind:
            return new OpenQuestionGameView(null, def as OpenQuestionGameDefinition);
        case GuessWordGameRequiredData.kind:
            return new GuessWordGameView(null, def as GuessWordGameDefinition);
        case NumericEstimationGameRequiredData.kind:
            return new NumericEstimationGameView(null, def as NumericEstimationGameDefinition);
        case QDCPGameRequiredData.kind:
            return new QDCPGameView(null, def as QDCPGameDefinition);
        case ZipGameRequiredData.kind:
            return new ZipGameView(null, def as ZipGameDefinition);
        
        default:
            throw new Error("Game type " + def.kind + " not registered.")
    }
}