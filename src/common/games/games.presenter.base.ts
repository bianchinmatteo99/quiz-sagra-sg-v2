import { GameDefinitionData } from "./games.contracts";

/**
 * Base presenter-side renderer contract for game-specific state panels.
 *
 * Concrete implementations are created by `games.presenter.register.ts` and used
 * by the presenter app to render a normalized view of `/state/game`.
 *
 * @typeParam TDefinition Concrete game definition payload used by the renderer.
 */
export abstract class GamePresenterStateView<TDefinition extends GameDefinitionData = GameDefinitionData> {
    /** Immutable game definition used to render labels and static settings. */
    protected readonly gameDefinition: TDefinition;

    /**
     * Create a presenter renderer bound to a parsed game definition payload.
     * @param gameDefinition Serializable definition metadata for the active game.
     */
    constructor(gameDefinition: TDefinition) {
        this.gameDefinition = gameDefinition;
    }

    /**
     * Render the game-specific presenter section.
     *
     * Implementations should validate and decode `gameState` before reading any
     * game-specific fields, and use `showSecrets` to decide whether hidden data
     * (such as unrevealed answers) can be displayed in clear text.
     *
     * @param container Target element to fully update.
     * @param gameState Runtime snapshot read from `/state/game`.
     * @param showSecrets Whether sensitive values can be displayed in clear text.
     */
    abstract render(container: HTMLElement, gameState: unknown, showSecrets: boolean): void;
}