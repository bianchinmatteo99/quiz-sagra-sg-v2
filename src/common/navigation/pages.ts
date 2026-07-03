import { CancelHandle } from "../general.utils";


export abstract class Page {
    shouldDisplayHeader = true;
    shouldDisplayFooter = true;
    protected container?: HTMLElement;
    abstract render(): void;
    abstract create(container: HTMLElement): void;
    abstract destroy(): void;
    isEqualTo(other: Page): boolean {
        return this === other;
    }
}

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

export abstract class EventPage extends Page {
    protected _cancelHandles: CancelHandle[] = [];
    abstract attachListeners(): CancelHandle[];
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
        if (!!this.container) {
            this.container.innerHTML = "";
            this.container = undefined;
        }
    }
}


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