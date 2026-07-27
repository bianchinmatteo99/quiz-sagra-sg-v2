export interface GamePresenterStateView {
    render(container: HTMLElement, gameState: unknown, showSecrets: boolean): void;
}