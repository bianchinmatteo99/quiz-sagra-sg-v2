import { CancelHandle } from "../common/general.utils";

export abstract class Page {
    shouldDisplayHeader = true;
    shouldDisplayFooter = true;
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
    static readonly FOOTERID = "page-footer"
    readonly container: HTMLElement;
    readonly header: HTMLElement;
    readonly footer: HTMLElement;
    currentPage?: Page;
    constructor() {
        this.container = document.getElementById(Pager.CONTAINERID)!;
        this.header = document.getElementById(Pager.HEADERID)!;
        this.footer = document.getElementById(Pager.FOOTERID)!;
    }

    showPage(p: Page): Page;
    showPage(p: null): void;
    showPage(p: Page | null): Page | void {
        this.currentPage?.destroy();
        if (!!p) {
            this.currentPage = p;
            p.create(this.container);
            this.header.classList.toggle("hidden", !p.shouldDisplayHeader);
            this.footer.classList.toggle("hidden", !p.shouldDisplayFooter);
            return p;
        }
    }

    updateFooter(name: string, points: number) {
        this.footer.querySelector("#team-name")!.textContent = name;
        this.footer.querySelector("#team-points")!.textContent = Math.floor(points).toString();
    }
}

export class LoginPage extends EventPage {
    shouldDisplayFooter: boolean = false;
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
    icon? : string;
    constructor(message : string = "", bottom_image? : string, icon? : string, show?: {header?: boolean, footer?: boolean}){
        super();
        this.message = message;
        this.bottom_image = bottom_image;
        this.icon = icon;
        if(!!show){
            this.shouldDisplayHeader = show.header ?? true;
            this.shouldDisplayFooter = show.footer ?? true;
        }
    }
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `<div style="flex:1"></div><span>${this.icon ? `<span class="material-symbols-outlined" style="font-size: 2em;color: var(--pico-primary);">${this.icon}</span><br>` : ''}${this.message}</span><div style="flex:1"></div>${this.bottom_image ? `<img src="${this.bottom_image}">` : ''}`;
    }
}