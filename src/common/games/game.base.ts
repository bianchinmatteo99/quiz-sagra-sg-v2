export interface GameConstructor {
    new(data: any): Game;
    parseFromMD(md: string): Game;
    parseFromJSON(data: any): Game;
}

export abstract class Game {
    abstract name: string;
    abstract toJSON(): any;
}
