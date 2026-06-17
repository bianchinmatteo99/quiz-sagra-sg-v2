export abstract class GameDefinition {
    abstract readonly name: string;
    abstract toJSON(): any;
}

export interface GameDefinitionBuilder<T extends GameDefinition> {
    parseFromMD(md: string): T;
    parseFromJSON(data: any): T;
}