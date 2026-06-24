import { Secret } from "../../general.utils";
import { GameModel, GameModelContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";

export enum CatenaState {
    STARTING,
    DISPLAYCOVER,
    DISPLAYCHAIN,
    ASKINGQUESTION,
    ENDING
}

export class ReazioneCatenaGameModel extends GameModel {

    definition: ReazioneCatenaGameDefinition;

    currentWordIndex: number;
    currentWordLetters: number;
    wordtransitiontime: number;
    currentDenyList: string[] = [];
    state: CatenaState;

    constructor(ctx: GameModelContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false) {
        super(ctx);
        this.definition = def;
        this.currentWordIndex = -1;
        this.currentWordLetters = 0;
        this.wordtransitiontime = -1;
        this.state = CatenaState.STARTING;

        if (restoreState) {
            this.loadFromDatabase();
        }
    }

    getWord(i: number): string|null {
        if(i in this.definition.words){
            return this.definition.words[i]
        } else {
            return null;
        }
    }
    getWordAsSecret(i: number): Secret<string>|null{
        const w = this.getWord(i);
        if(!w) return null;
        return new Secret(w, (clearValue)=> {
            if (this.currentWordIndex>i){
                return clearValue;
            } else if (i==this.currentWordIndex){
                return clearValue.slice(0, this.currentWordLetters) + (this.currentWordLetters==clearValue.length ? "" : "***");
            } else {
                return "***"
            }
        });
    }
    getCurrentWord(): string|null {
        return this.getWord(this.currentWordIndex);
    }

    parseFromJSON(data: any): boolean {
        // Parse quiz definition from JSON data
        try {
            this.currentWordIndex = data.currentWordIndex ?? 0;
            return true;
        } catch (error) {
            console.error('Error parsing game from JSON:', error);
            return false;
        }
    }
    toJSON() {
        return {
            currentWordIndex: this.currentWordIndex,
        };
    }
}