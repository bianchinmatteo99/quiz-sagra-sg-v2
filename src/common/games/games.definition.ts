import { ReazioneCatenaGame } from "./catena/catena";

export const existingGames: { [key: string]: GameConstructor; } = {
    "catena": ReazioneCatenaGame,
};


export interface GameConstructor {
    new(data: any): Game;
    parseFromMD(md: string): Game;
    parseFromJSON(data: any): Game;
}
export abstract class Game {
    static name: string;
    abstract toJSON(): any;
}


