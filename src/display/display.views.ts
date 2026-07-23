import { MulticolPage, Page, Pager, StaticPage } from "../common/navigation/pages";
import { QuestionState } from "../common/questions/question.base";

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
    constructor(gameP : Page, questionP : Page|null){
        super()
        this.columns = [gameP, questionP]
        this.defaultTemplateColumns = this.getTemplateColumns(gameP, questionP)
    }
    updateWith(gameP : Page, questionP : Page|null){
        this.updatePage(0, gameP)
        this.updatePage(1, questionP)
        this.gridTemplateColumns = this.getTemplateColumns(gameP, questionP)
    }
    getTemplateColumns(gameP : Page & {templateColumnWidth?: string}, hasQuestionP : Page|null){
        if(Object.hasOwn(gameP, "templateColumnWidth")){

        }
        return (gameP.templateColumnWidth ?? "auto") + " " + (!!hasQuestionP ? "1fr" : "0")
    }
}

export class QuestionPage extends StaticPage {
    lastKnownState : QuestionState
    constructor(state : QuestionState){
        super()
        this.lastKnownState = state
    }
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
                <h2>DOMANDA IN CORSO</h2>
                <span id="question-subtitle"></span>
                <div id="question-content" style="width:80%; aspect-ratio: 1;"></div>
        `;
        Object.assign(this.container.style, {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column"
        })
        this.update()
    }
    update(state? : QuestionState){
        if(state == this.lastKnownState) return;
        if(state != undefined){
            this.lastKnownState = state
        } 
        if(!this.container) return;

        const sub = this.container.querySelector("#question-subtitle")!
        const content = this.container.querySelector("#question-content")!
        sub.textContent = "Valutazione"
        content.innerHTML = `
            <style>
            .loader {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .spinner {
                width: 40px;
                height: 40px;
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
            <div class="loader"><div class="spinner"></div></div>
        `
        switch(this.lastKnownState){

        }
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
        if(!this.container) throw new Error("Render called before create");
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
        if(!this.container) throw new Error("Render called before create");
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
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            RANKING GOES HERE
        `;
    }
}

export class FinalRankingPage extends StaticPage {
    render(): void {
        if(!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            FINAL RANKING GOES HERE
        `;
    }
}