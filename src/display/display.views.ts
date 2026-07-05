import { Page, Pager, StaticPage } from "../common/navigation/pages";

export class DisplayPager extends Pager {
    static readonly CONTAINERID = "page-container"
    readonly container: HTMLElement;
    
    constructor() {
        super();
        this.container = document.getElementById(DisplayPager.CONTAINERID)!;
    }
}

export class IdleStatusPage extends StaticPage { // just pasted from user; O BE UPDATED
    static readonly DEFAULT_IMAGES = {
        waiting_for_start: "/img/waiting_for_start.png",
    };
    message : string;
    bottom_image? : string;
    icon? : string;
    isGifIcon? : boolean;
    loading? : boolean;
    constructor(message : string = "", imageOptions?: {bottom_image? : string, icon? : string, isGifIcon? : boolean, loading? : boolean}, show?: {header?: boolean, footer?: boolean}){
        super();
        this.message = message;
        this.bottom_image = imageOptions?.bottom_image;
        this.icon = imageOptions?.icon;
        this.isGifIcon = imageOptions?.isGifIcon;
        this.loading = imageOptions?.loading;
        if(!!show){
            this.shouldDisplayHeader = show.header ?? true;
            this.shouldDisplayFooter = show.footer ?? true;
        }
    }
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        let icon = "";
        if(!!this.icon){
            if(this.isGifIcon){
                icon = `<img src="${this.icon}" style="width: 250px;"><br/>`;
            } else {
                icon = `<span class="material-symbols-outlined" style="font-size: 2em;color: var(--pico-primary);">${this.icon}</span><br/>`;
            }
        }
        this.container.innerHTML = `
            <div style="flex:1"></div>
            <span>${icon}${this.message}</span>
            ${this.loading ? `<br><span aria-busy="true"></span>` : ''}
            <div style="flex:1"></div>
            ${this.bottom_image ? `<img src="${this.bottom_image}">` : ''}
        `;
    }
    isEqualTo(other: Page): boolean {
        return other instanceof IdleStatusPage && this.message == other.message && this.bottom_image == other.bottom_image && this.icon == other.icon && this.isGifIcon == other.isGifIcon && this.loading == other.loading;
    }
}
