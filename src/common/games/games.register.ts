import { ReazioneCatenaGameDefinitionBuilder } from "./catena/catena";
import { GameDefinition, GameDefinitionBuilder } from "./game.base";

export const gamesDefBuilders: { [key: string]: GameDefinitionBuilder<GameDefinition>; } = {
    "catena": new ReazioneCatenaGameDefinitionBuilder(),
};




