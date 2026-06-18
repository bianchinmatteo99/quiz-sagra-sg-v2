import { GameModel, GameModelContext } from "../game.base";
import { ReazioneCatenaGameDefinition } from "./catena.definition";


export class ReazioneCatenaGameModel extends GameModel {

    definition: ReazioneCatenaGameDefinition;

    currentWordIndex: number;

    constructor(ctx: GameModelContext, def: ReazioneCatenaGameDefinition, restoreState: boolean = false) {
        super(ctx);
        this.definition = def;
        this.currentWordIndex = 0;

        if (restoreState) {
            this.loadFromDatabase();
        }
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