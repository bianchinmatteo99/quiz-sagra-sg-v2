import { CancelHandle } from "../common/general.utils";

export abstract class Page {
    shouldDisplayHeader = true;
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
    attachListenerTo(element:HTMLElement, event: string, callback: (e:any)=>void): CancelHandle{
        element.addEventListener(event, callback);
        return ()=>element.removeEventListener(event, callback);
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



export class Pager {
    static readonly CONTAINERID = "page-container"
    static readonly HEADERID = "page-header"
    readonly container: HTMLElement;
    readonly header: HTMLElement;
    currentPage?: Page;
    constructor() {
        this.container = document.getElementById(Pager.CONTAINERID)!;
        this.header = document.getElementById(Pager.HEADERID)!;
    }

    showPage(p: Page): Page;
    showPage(p: null): void;
    showPage(p: Page | null): Page | void {
        this.currentPage?.destroy();
        if (!!p) {
            this.currentPage = p;
            p.create(this.container);
            this.header.classList.toggle("hidden", !p.shouldDisplayHeader);
            return p;
        }
    }
}

export class LoginPage extends EventPage {
    constructor(private name:string|null, private callback: (name:string)=>void){super();};
    attachListeners(): CancelHandle[] {
        const input = this.container?.getElementsByTagName("input")[0] as HTMLInputElement;
        const button = this.container?.getElementsByTagName("button")[0] as HTMLButtonElement;
        return [this.attachListenerTo(button, "click", ()=>{
            this.callback(input.value);
        })];
    }
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
        <span>TEST</span>
        <input id="testinp" value="${this.name??""}" />
        <button id="test">Register</button>
        `;
    }

}

export class LoadingPage extends StaticPage {
    static readonly DEFAULT_IMAGES = {
        waiting_for_start: "/img/waiting_for_start.png",
    };
    message : string;
    bottom_image? : string;
    constructor(message : string = "", bottom_image? : string){
        super();
        this.message = message;
        this.bottom_image = bottom_image;
    }
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `<div style="flex:1"></div><span>${this.message}</span><div style="flex:1"></div>${this.bottom_image ? `<img src="${this.bottom_image}">` : ''}`;
    }
}