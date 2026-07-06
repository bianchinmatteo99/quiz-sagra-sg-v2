import { CancelHandle } from "../general.utils";

/**
 * Base contract for a screen-like view that can be mounted in a pager.
 *
 * Pages are the UI unit used by the user and display flows when the current
 * state decides which interface should be visible. A page is responsible for
 * rendering its markup, optionally wiring event listeners and cleaning up its
 * DOM when it is no longer active.
 */
export abstract class Page {
    /**
     * Whether the surrounding layout should show the shared header.
     */
    shouldDisplayHeader = true;
    /**
     * Whether the surrounding layout should show the shared footer.
     */
    shouldDisplayFooter = true;
    /**
     * The DOM container that owns this page's rendered content.
     */
    protected container?: HTMLElement;
    /**
     * Renders the page contents into the current container.
     */
    abstract render(): void;
    /**
     * Mounts the page into a container and prepares its content.
     */
    abstract create(container: HTMLElement): void;
    /**
     * Removes the page content and releases any resources owned by the page.
     */
    abstract destroy(): void;

    /**
     * Compares two pages to decide whether they should be treated as the same
     * screen. The default implementation uses object identity.
     */
    isEqualTo(other: Page): boolean {
        return this === other;
    }
}

/**
 * A page that renders its content once and does not need to manage listeners.
 *
 * This is suitable for simple informational screens such as the waiting or
 * onboarding views used by the display flow.
 */
export abstract class StaticPage extends Page {
    create(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    destroy() {
        if (!!this.container) {
            this.container.innerHTML = "";
            this.container = undefined;
        }
    }
}

/**
 * A page that can register DOM event listeners and later remove them safely.
 *
 * This is used by pages whose interaction model needs to react to clicks or
 * input events while staying in sync with the pager lifecycle.
 */
export abstract class EventPage extends Page {
    protected _cancelHandles: CancelHandle[] = [];

    /**
     * Registers the listeners required by the page.
     */
    abstract attachListeners(): CancelHandle[];

    /**
     * Helper that wires an event handler and returns a cleanup callback.
     */
    attachListenerTo(element: HTMLElement, event: string, callback: (e: any) => void): CancelHandle {
        element.addEventListener(event, callback);
        return () => element.removeEventListener(event, callback);
    }

    create(container: HTMLElement) {
        this.container = container;
        this.render();
        this._cancelHandles.push(...this.attachListeners());
    }

    destroy() {
        this._cancelHandles.forEach(c => c());
        this._cancelHandles = [];
        if (!!this.container) {
            this.container.innerHTML = "";
            this.container = undefined;
        }
    }
}

/**
 * Manages the currently visible page inside a concrete container.
 *
 * The pager is the bridge between the state-driven decision trees and the DOM:
 * when a new page is selected, the previous page is destroyed and the new page
 * is mounted in the shared container.
 */
export abstract class Pager {
    abstract readonly container: HTMLElement;
    currentPage?: Page;

    showPage(p: Page): Page;
    showPage(p: null): void;
    showPage(p: Page | null): Page | void;
    showPage(p: Page | null): Page | void {
        if (p === null) {
            this.currentPage?.destroy();
            this.currentPage = undefined;
            return;
        }
        if (!!this.currentPage && this.currentPage.isEqualTo(p)) {
            return this.currentPage;
        } else {
            this.currentPage?.destroy();
            this.currentPage = p;
            p.create(this.container);
            return p;
        }
    }
}