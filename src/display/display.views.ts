import { CancelHandle, delay } from "../common/general.utils";
import { MulticolPage, Page, Pager, StaticPage } from "../common/navigation/pages";
import { QuestionState } from "../common/questions/question.base";
import { TimerHandler } from "./display.state";

type PageColDef = [string, Page][]
/**
 * Bridges the display pages to the shared container in the document.
 */
export class DisplayPager extends Pager {
    static readonly CONTAINERID = "page-container"
    readonly container: HTMLElement;

    /**
     * Creates a pager bound to the page container element.
     */
    constructor() {
        super();
        this.container = document.getElementById(DisplayPager.CONTAINERID)!;
    }
}

export class GameQuestionColPage extends MulticolPage {
    columns: (Page | null)[];
    defaultTemplateColumns: string;
    constructor(gameP: Page, questionP: Page | null) {
        super()
        this.columns = [gameP, questionP]
        this.defaultTemplateColumns = this.getTemplateColumns(gameP, questionP)
    }
    updateWith(gameP: Page, questionP: Page | null) {
        this.updatePage(0, gameP)
        this.updatePage(1, questionP)
        this.gridTemplateColumns = this.getTemplateColumns(gameP, questionP)
    }
    getTemplateColumns(gameP: Page & { templateColumnWidth?: string }, hasQuestionP: (Page & { templateColumnWidth?: string }) | null) {
        return (gameP.templateColumnWidth ?? "auto") + " " + (hasQuestionP?.templateColumnWidth ?? "0")
    }
}

export class QuestionPage extends StaticPage {
    templateColumnWidth = "0fr"
    lastKnownState: QuestionState | null
    timer: TimerHandler
    timerListenerHandle?: CancelHandle
    constructor(state: QuestionState | null, timer: TimerHandler) {
        super()
        this.lastKnownState = state
        this.timer = timer
        this.timerListenerHandle = timer.addListener((t) => {
            const el : HTMLDivElement|null|undefined = this.container?.querySelector("#timer")
            if (!!el) {
                el.textContent = t >= 0 ? t.toString() : ""
                // Restart CSS animation
                el.classList.remove("flash");                
                void el.offsetWidth;
                el.classList.add("flash");
            }
        })
    }
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
                <h4 style="font-size: 1rem;">DOMANDA<br/>IN CORSO</h4>
                <div id="question-content" style="height:50%; width: 100%;display: flex;flex-direction: column;align-items: center;justify-content: space-evenly;"></div>
        `;
        Object.assign(this.container.style, {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            overflow: "hidden",
            transition: "opacity 1s ease"
        })
        this.update()
    }
    update(state?: QuestionState | null) {
        if (state === this.lastKnownState) return;
        if (state !== undefined) {
            this.lastKnownState = state
        }
        if (!this.container) return;

        const content = this.container.querySelector("#question-content")!
        let html = ""
        switch (this.lastKnownState) {
            case QuestionState.ASKING:
                html = `
                <style>
                    #timer {
                        display: inline-block;
                        font-size: 100px;
                        color:var(--pico-primary);
                        font-weight:bold;
                    }

                    #timer.flash {
                        animation: rapid-flash 150ms ease-out;
                    }

                    @keyframes rapid-flash {
                        0% {
                            transform: scale(1);
                            opacity: 1;
                        }

                        30% {
                            transform: scale(1.15);
                            opacity: 0.5;
                        }

                        100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                </style>
                <div id="timer">${this.timer.curtime ?? ""}</div>`
                break
            case QuestionState.EVALUATING:
                html = `
                    <style>
                    .spinner {
                        width: 100px;
                        height: 100px;
                        border: 4px solid #ddd;
                        border-top-color: #333;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        to {
                            transform: rotate(360deg);
                        }
                    }
                    </style>
                    <span id="question-subtitle" style="font-size:.8rem">Valutazione</span>
                    <div class="spinner"></div>
                `
                break
        }
        if (!!html) {
            content.innerHTML = html
            this.container.style.opacity = "1"
            this.templateColumnWidth = "1fr"
        } else {
            content.innerHTML = ""
            this.container.style.opacity = "0"
            this.templateColumnWidth = "0fr"
        }
    }
    destroy(): void {
        this.timerListenerHandle?.()
        super.destroy()
    }
}

/**
 * Renders the waiting screen shown before the quiz starts.
 */
export class WaitingStartPage extends StaticPage {
    /**
     * Renders the pre-start welcome layout into the shared page container.
     */
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            <span style="grid-column: span 6;display: flex;flex-direction: column;align-items: center;justify-content: center;gap: 30px;">
                <img src="/favicon/favicon.svg" style="height: 25vh;">
                <span style="color: var(--pico-secondary);">
                    <h1 style="color: var(--pico-primary);">QUIZ</h1>
                    Alle ore 21:15
                </span>
            </span>            
            
            <span style="grid-column: span 6;display: flex;flex-direction: column;align-items: center;justify-content: end;gap: 50px;">
                <span>Pronti per cominciare?<br>Mettetevi comodi!</span>
                <img src="/img/waiting_for_start.png" style="max-height:50%;padding-bottom: 30px;">
            </span>
        `;
    }
}

/**
 * Renders the onboarding screen that guides participants to register their team.
 */
export class OnBoardingPage extends StaticPage {
    /**
     * Renders the QR-based onboarding layout into the shared page container.
     */
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            <span style="grid-column: span 6;display: flex;flex-direction: column;align-items: center;justify-content: center;gap: 30px;">
                <span style="color: var(--pico-secondary);font-size: .8rem;">Inquadra il codice QR</span>
                <img src="/img/qr-code.png" style="height: 25vh;">
                <span style="color: var(--pico-secondary);font-size: .8rem;">oppure vai al sito
                <br>www.quiz-sg-v2.web.app</span>
                <span style="font-size: .5rem;margin: 50px 0 0 0;">Utilizzare un solo telefono per squadra</span>
                <span style="font-size: .5rem;">Saranno accettati solo i nomi delle squadre precedentemente concordati</span>
            </span>            
            
            <span style="grid-column: span 6;display: flex;flex-direction: column;align-items: center;justify-content: end;gap: 50px;">
                <span>Registrazione<br>squadre</span>
                <img src="/img/phone.png" style="max-height:50%;padding-bottom: 30px;">
            </span>
        `;
    }
}

export class RankingPage extends StaticPage {
    futureList : Promise<{ name: string, points: number, position: number}[]>;
    constructor(futureRankingList : Promise<{ name: string, points: number, position: number}[]>){
        super()
        this.futureList = futureRankingList
    }
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            <style>
            #ranking > div {
                display: grid;
                grid-template-rows: 0fr;
                transition: grid-template-rows 300ms ease;
            }
            #ranking > div.open {
                grid-template-rows: 1fr;
            }
            #ranking > div > div {
                display: flex;
                border: 0px solid var(--pico-primary-border);
                border-radius: 20px;
                align-items: center;
                overflow: hidden;
                transform-origin: top;
                transform: scale(0);
                margin: 0;
                transition: margin 300ms ease, transform 300ms ease, border-width 300ms ease;
            }
            #ranking > div.open > div {
                transform: scale(1);
                margin: 10px 0;
                border-width: 2px;
            }
            #ranking > div > div > span:nth-child(1) {
                width: 150px;
                padding: 0 20px;
                font-weight: bold;
                color: var(--pico-primary);
            }
            #ranking > div > div > span:nth-child(2) {
                flex: 1;
                text-align: left;
            }
            #ranking > div > div > span:nth-child(3) {
                padding: 0 20px;
                color: gray;
                font-size: .8em;
            }  
            </style>
            <div style="grid-column: 2 / span 10;">
                <h4 style="margin:40px;">CLASSIFICA</h4>
                <div id="ranking"></div>
            </div>
        `;
        this.futureList.then(async (list)=>{
            const el = this.container!.querySelector("#ranking")!
            for(let x of list){
                await delay(1000)
                const div = document.createElement("div");
                div.innerHTML = `<div><span>${x.position}</span><span>${x.name}</span><span>${x.points} punti</span></div>`
                el.insertAdjacentElement("afterbegin", div)
                div.offsetHeight
                div.classList.add("open")
            }
        })
    }
}

export class FinalRankingPage extends StaticPage {
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            FINAL RANKING GOES HERE
        `;
    }
}

export class EmptyPage extends StaticPage {
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = ``;
    }
}