import { CancelHandle } from "../common/general.utils";

abstract class Page {
    protected container?: HTMLElement
    abstract render(): void;
    abstract create(container: HTMLElement): void;
    abstract destroy(): void;
}

abstract class StaticPage extends Page {
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

abstract class EventPage extends Page {
    protected _cancelHandles: CancelHandle[] = [];
    abstract attachListeners(): CancelHandle[];
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



class Pager {
    static readonly CONTAINERID = "page-container"
    readonly container: HTMLElement;
    currentPage?: Page;
    constructor() {
        this.container = document.getElementById(Pager.CONTAINERID)!;
    }

    showPage(p: Page): Page;
    showPage(p: null): void;
    showPage(p: Page | null): Page | void {
        this.currentPage?.destroy();
        if (!!p) {
            this.currentPage = p;
            p.create(this.container);
            return p;
        }
    }
}