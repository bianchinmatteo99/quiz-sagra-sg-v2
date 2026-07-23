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
    constructor(state: QuestionState | null) {
        super()
        this.lastKnownState = state
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
                html = "timer"
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
        if(!!html){
            content.innerHTML = html
            this.container.style.opacity = "1"
            this.templateColumnWidth = "1fr"
        } else {
            content.innerHTML = ""
            this.container.style.opacity = "0"
            this.templateColumnWidth = "0fr"
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
    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            RANKING GOES HERE
        `;
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