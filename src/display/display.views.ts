import { Page, Pager, StaticPage } from "../common/navigation/pages";

export class DisplayPager extends Pager {
    static readonly CONTAINERID = "page-container"
    readonly container: HTMLElement;
    
    constructor() {
        super();
        this.container = document.getElementById(DisplayPager.CONTAINERID)!;
    }
}

export class WaitingStartPage extends StaticPage {
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
            
            <span style="grid-column: span 6;height: 100%;display: flex;flex-direction: column;align-items: center;justify-content: end;gap: 50px;">
                <span>Pronti per cominciare?<br>Mettetevi comodi!</span>
                <img src="/img/waiting_for_start.png" style="padding-bottom: 30px;">
            </span>
        `;
    }
}

export class OnBoardingPage extends StaticPage {
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
            
            <span style="grid-column: span 6;height: 100%;display: flex;flex-direction: column;align-items: center;justify-content: end;gap: 50px;">
                <span>Registrazione<br>squadre</span>
                <img src="/img/phone.png" style="padding-bottom: 30px;">
            </span>
        `;
    }
}