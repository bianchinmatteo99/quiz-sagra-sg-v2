import { IRenderable } from "./renderable.interface";


export class Navigator {
    private locations = new Map<string, HTMLElement>();
    private current = new Map<string, IRenderable>();

    constructor(locations: Record<string, HTMLElement> = {}) {
        this.locations = new Map(Object.entries(locations));
    }

    public register(name: string, element: HTMLElement): void {
        this.locations.set(name, element);
    }

    public async mount(name: string, target: IRenderable): Promise<void> {
        const root = this.getLocation(name);

        const existing = this.current.get(name);
        if (existing) {
            await existing.renderer.unmount();
        }

        this.current.set(name, target);
        await target.renderer.mount(root);
    }

    public async unmount(name: string): Promise<void> {
        const existing = this.current.get(name);
        if (!existing) return;

        await existing.renderer.unmount();
        this.current.delete(name);
    }

    public async rerender(name: string): Promise<void> {
        const existing = this.current.get(name);
        if (!existing) {
            throw new Error(`Nothing mounted at "${name}"`);
        }

        await existing.renderer.rerender();
    }

    private getLocation(name: string): HTMLElement {
        const root = this.locations.get(name);
        if (!root) {
            throw new Error(`Unknown location "${name}"`);
        }
        return root;
    }
}