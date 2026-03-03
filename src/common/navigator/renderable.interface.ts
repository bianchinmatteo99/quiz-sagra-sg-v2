import { CancelHandle } from "../general.interfaces";

/**
 * Represents a source of state updates.
 * @template T The type of the state value.
 */
interface StateProvider<T> {
    /**
     * Registers a callback to be invoked when the state value changes.
     * @param callback The function to call with the new state value.
     */
    onValue(callback: (value: T) => void): void;
}


/**
 * Base class for UI components that are state-driven and emit events.
 * 
 * @template S The type of the component's state.
 * @template TEvents A record mapping event names to their listener signatures.
 * 
 * @example
 * ```typescript
 * const myEvents = {
 *   click: (x: number, y: number) => {},
 *   close: () => {},
 * };
 * 
 * class MyComponent extends RenderableUI<MyState, typeof myEvents> {
 *   protected readonly eventDefs = myEvents;
 *   
 *   protected render(state: MyState) {
 *     return `<button onclick="${this.emit('click', 0, 0)}">Click me</button>`;
 *   }
 * }
 * ```
 */
export abstract class RenderableUI<S, TEvents extends Record<string, (...args: any[]) => void>> {
    /** The root element where this component is mounted. */
    #root: HTMLElement | null = null;

    /** Definition of the events this component can emit. Must be implemented by subclasses. */
    protected abstract readonly eventDefs: TEvents;

    /** Internal storage for event listeners. */
    private listeners: {
        [K in keyof TEvents]?: Set<TEvents[K]>
    } = {};

    /** The current state of the component. */
    protected state?: S;

    /**
     * Creates an instance of RenderableUI.
     * @param stateProvider The provider that supplies state updates.
     */
    constructor(stateProvider: StateProvider<S>) {
        stateProvider.onValue((value) => {
            this.state = value;
            void this.rerender();
        });
    }

    /**
     * Gets the root element.
     * @throws Error if the component is not yet mounted.
     */
    protected get root(): HTMLElement {
        if (!this.#root) {
            throw new Error("Not mounted");
        }
        return this.#root;
    }

    /**
     * Checks if the component is currently mounted to the DOM.
     * @returns True if mounted, false otherwise.
     */
    public mounted(): boolean {
        return this.#root !== null;
    }

    /**
     * Mounts the component to a given root element and performs the initial render.
     * @param root The HTML element to mount into.
     * @throws Error if already mounted or if state is not initialized.
     */
    public async mount(root: HTMLElement): Promise<void> {
        if (this.mounted()) {
            throw new Error("Already mounted");
        }
        if (!this.state) {
            throw new Error("State not initialized");
        }

        this.#root = root;

        root.innerHTML = await this.render(this.state);
        await this.onMount();
    }

    /**
     * Unmounts the component from the DOM and cleans up.
     */
    public async unmount(): Promise<void> {
        if (!this.mounted()) return;

        await this.onUnmount();

        this.#root!.innerHTML = "";
        this.#root = null;
    }

    /**
     * Triggers a re-render of the component if it is mounted.
     */
    public async rerender(): Promise<void> {
        if (!this.mounted()) {
            return;
        }

        await this.mount(this.#root!);
    }

    /**
     * Gets the names of all events defined for this component.
     */
    get eventNames(): (keyof TEvents)[] {
        return Object.keys(this.eventDefs) as (keyof TEvents)[];
    }

    /**
     * Registers a listener for a specific event.
     * @param event The name of the event to listen for.
     * @param listener The callback function to invoke.
     * @returns A handle to cancel the subscription, or null if the event doesn't exist.
     */
    public on<K extends keyof TEvents>(event: K, listener: TEvents[K]): CancelHandle | null {
        if (!(event in this.eventDefs)) {
            console.warn(`Rejected listener to non-existing event: ${String(event)}`);
            return null;
        }
        const set = (this.listeners[event] ??= new Set());
        set.add(listener);
        return () => set.delete(listener);
    }

    /**
     * Emits an event, invoking all registered listeners.
     * @param event The name of the event to emit.
     * @param args The arguments to pass to the listeners.
     */
    public emit<K extends keyof TEvents>(
        event: K,
        ...args: Parameters<TEvents[K]>
    ): void {
        const set = this.listeners[event];
        if (!set) return;

        for (const listener of set) {
            listener(...args);
        }
    }

    /**
     * Returns a promise that resolves when the specified event occurs.
     * @param event The name of the event to wait for.
     * @returns A promise resolving with the event arguments.
     * @throws Error if the event does not exist.
     */
    public happens<K extends keyof TEvents>(
        event: K
    ): Promise<Parameters<TEvents[K]>> {
        if (!(event in this.eventDefs)) {
            throw new Error(`Event ${String(event)} does not exist; promise cannot resolve.`);
        }
        return new Promise(resolve => {
            const off = this.on(
                event,
                ((...args: Parameters<TEvents[K]>) => {
                    off!();
                    resolve(args);
                }) as TEvents[K]
            );
        });
    }

    /**
     * Renders the component's UI based on the current state.
     * @param state The state to use for rendering.
     * @returns The HTML string (or a promise of it).
     */
    protected abstract render(state: S): string | Promise<string>;

    /**
     * Lifecycle hook called immediately after the component is mounted.
     */
    protected async onMount(): Promise<void> { }

    /**
     * Lifecycle hook called immediately before the component is unmounted.
     */
    protected async onUnmount(): Promise<void> { }

    /**
     * Optional lifecycle hook called before a re-render.
     */
    protected async onBeforeRerender?(): Promise<void>;

    /**
     * Optional lifecycle hook called after a re-render.
     */
    protected async onAfterRerender?(): Promise<void>;
}

/**
 * Interface for objects that wrap a RenderableUI instance.
 */
export interface IRenderable {
    /** The underlying renderer instance. */
    renderer: RenderableUI<any, any>;
}
