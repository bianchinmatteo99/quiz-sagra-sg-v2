import { ReazioneCatenaGame } from "./catena/catena";
import { GameConstructor } from "./game.base";

export const existingGames: { [key: string]: GameConstructor; } = {
    "catena": ReazioneCatenaGame,
};




