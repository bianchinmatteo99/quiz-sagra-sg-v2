import { CancelHandle } from "../common/general.utils";
import { Page, EventPage, StaticPage, Pager } from "../common/navigation/pages";

/**
 * Pager implementation for the user-facing section of the quiz.
 *
 * Manages the main page container and conditionally shows or hides
 * the page header and footer during page transitions.
 */
export class UserPager extends Pager {
    static readonly CONTAINERID = "page-container"
    static readonly HEADERID = "page-header"
    static readonly FOOTERID = "page-footer"
    readonly container: HTMLElement;
    readonly header: HTMLElement;
    readonly footer: HTMLElement;
    
    constructor() {
        super();
        this.container = document.getElementById(UserPager.CONTAINERID)!;
        this.header = document.getElementById(UserPager.HEADERID)!;
        this.footer = document.getElementById(UserPager.FOOTERID)!;
    }

    /**
     * Render the requested page and toggle the header/footer visibility.
     *
     * The header and footer are hidden when the current page requests they be hidden.
     *
     * @param p - Page instance to show, or null to clear the current page.
     * @returns The displayed page when a page is shown.
     */
    showPage(p: Page): Page;
    showPage(p: null): void;
    showPage(p: Page | null): Page | void {
        const ret = super.showPage(p);
        if (!!this.currentPage) {
            this.header.classList.toggle("hidden", !this.currentPage.shouldDisplayHeader);
            this.footer.classList.toggle("hidden", !this.currentPage.shouldDisplayFooter);
        }
        return ret;
    }

    /**
     * Update footer team information and animate score changes.
     *
     * @param name - Display name for the current team.
     * @param points - Current team score.
     */
    updateFooter(name: string, points: number) {
        this.footer.querySelector("#team-name")!.textContent = name;
        const scoreElement = this.footer.querySelector("#team-score")!;
        const lastScore = parseInt(scoreElement.textContent || "0");
        scoreElement.textContent = Math.floor(points).toString();
        const diff = points - lastScore;
        if (diff != 0) {
            scoreElement.setAttribute("data-last-updated", `${diff>0?"+":""}${Math.floor(diff)}`);
            scoreElement.classList.remove("positive", "negative");
            scoreElement.classList.add(diff > 0 ? "positive" : "negative");
            this.footer.querySelector("#team-score")!.classList.add("animate");
        }
    }
}

/**
 * Page shown during onboarding when the user must enter a group name.
 *
 * Captures the entered team name and passes it back through a callback.
 */
export class LoginPage extends EventPage {
    shouldDisplayFooter: boolean = false;
    /**
     * @param name - Optional pre-filled group name.
     * @param callback - Called when the user submits the team name.
     */
    constructor(private name:string|null, private callback: (name:string)=>void){super();};
    /**
     * Attach the submit listener for the login form.
     *
     * @returns Cancel handles to remove attached listeners when the page is destroyed.
     */
    attachListeners(): CancelHandle[] {
        const input = this.container?.getElementsByTagName("input")[0] as HTMLInputElement;
        const button = this.container?.getElementsByTagName("button")[0] as HTMLButtonElement;
        return [this.attachListenerTo(button, "click", ()=>{
            this.callback(input.value);
        })];
    }
    /**
     * Render the login input form into the page container.
     *
     * Throws if the page has not been created yet.
     */
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
        <span>Inserisci il nome del gruppo</span>
        <input value="${this.name??""}" />
        <button>Invia</button>
        `;
    }

}

/**
 * Static status page used to display idle, waiting, and informational screens.
 *
 * Supports optional bottom images, icons, loading indicators, and header/footer visibility.
 */
export class IdleStatusPage extends StaticPage {
    static readonly DEFAULT_IMAGES = {
        waiting_for_start: "/img/waiting_for_start.png",
    };
    message : string;
    bottom_image? : string;
    icon? : string;
    isGifIcon? : boolean;
    loading? : boolean;
    /**
     * @param message - Message text displayed in the page.
     * @param imageOptions - Optional display options for images and icons.
     * @param show - Optional visibility overrides for header and footer.
     */
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
    /**
     * Render status content and optional visual elements into the page container.
     *
     * Throws if the underlying container has not been created yet.
     */
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
    /**
     * Compare this page to another page for equivalence.
     *
     * @param other - Page to compare with.
     * @returns True when both pages represent the same idle status configuration.
     */
    isEqualTo(other: Page): boolean {
        return other instanceof IdleStatusPage && this.message == other.message && this.bottom_image == other.bottom_image && this.icon == other.icon && this.isGifIcon == other.isGifIcon && this.loading == other.loading;
    }
}

/**
 * Base page class for question interactions requiring an answer callback.
 */
export abstract class UserQuestionPage extends EventPage {
    onAnswer: (answer: string) => void;
    constructor(onAnswer: (answer: string) => void){
        super();
        this.onAnswer = onAnswer;
    }
}