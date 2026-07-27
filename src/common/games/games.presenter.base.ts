import { GameDefinitionData } from "./games.contracts";

export abstract class GamePresenterStateView<TDefinition extends GameDefinitionData = GameDefinitionData> {
    protected readonly gameDefinition: TDefinition;

    constructor(gameDefinition: TDefinition) {
        this.gameDefinition = gameDefinition;
    }

    abstract render(container: HTMLElement, gameState: unknown, showSecrets: boolean): void;
}