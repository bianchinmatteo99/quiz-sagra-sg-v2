import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { QDCPGameStateSnapshot, QDCPState } from "./qdcp.contracts";

export class QDCPGamePageChooser extends GamePageChooser<QDCPGameStateSnapshot> {
    private mainPage = new QDCPMainPage();

    decide(state: QDCPGameStateSnapshot): Page {
        if (state.state === QDCPState.ASKINGQUESTION) {
            this.mainPage.update(state.displayContents ?? []);
            return this.mainPage;
        }

        this.clear();
        return new QDCPCoverPage(state.title);
    }

    clear(): void {
        this.mainPage = new QDCPMainPage();
    }
}

class QDCPCoverPage extends StaticPage {
    templateColumnWidth = "1fr";
    private readonly title: string;

    constructor(title: string) {
        super();
        this.title = title;
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            <h2>${this.title.toUpperCase()}</h2>
            <img src="/img/decision-making.gif" style="height:50%;"/>
        `;
        Object.assign(this.container.style, {
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexDirection: "column",
        });
    }
}

class QDCPMainPage extends StaticPage {
    templateColumnWidth = "70%";

    private displayContents: string[] = [];
    private rows: HTMLDivElement[] = [];

    update(displayContents: string[]): void {
        this.displayContents = displayContents;
        if (this.container) {
            this.applyRows();
        }
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.id = "qdcp-main";
        this.container.innerHTML = `
            <style>
                #qdcp-main {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                }
                #qdcp-main .rows {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    width: min(760px, 92%);
                    height: min(82vh, 760px);
                }
                #qdcp-main .row {
                    flex: 1 1 0;
                    min-height: 0;
                    border-radius: 14px;
                    background: #ffffff;
                    color: var(--pico-primary);
                    border: 2px solid rgba(0, 0, 0, 0.08);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 0.75rem 1.1rem;
                    text-align: center;
                    font-size: clamp(1.1rem, 2.1vw, 2rem);
                    line-height: 1.2;
                    transition: background-color 700ms ease, color 700ms ease, border-color 700ms ease;
                }
                #qdcp-main .row.active {
                    color: #ffffff;
                    border-color: transparent;
                }
                #qdcp-main .row.row-0.active { background-color: #6f92ca; }
                #qdcp-main .row.row-1.active { background-color: #6ca7a1; }
                #qdcp-main .row.row-2.active { background-color: #9a7fbe; }
                #qdcp-main .row.row-3.active { background-color: #c18586; }
                #qdcp-main .row.answer {
                    background: #ffffff;
                    color: var(--pico-primary);
                    font-weight: 800;
                    border-color: rgba(0, 0, 0, 0.12);
                }
            </style>

            <div class="rows">
                ${[0, 1, 2, 3, 4].map((i) => `<div class="row row-${i}"><span></span></div>`).join("")}
            </div>
        `;

        this.rows = Array.from(this.container.querySelectorAll<HTMLDivElement>(".row"));
        this.applyRows();
    }

    private applyRows(): void {
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            const textEl = row.querySelector("span");
            const text = this.displayContents[i] ?? "";
            const hasText = text.trim().length > 0;
            const isAnswerRow = i === 4;

            if (!textEl) continue;

            if (hasText) {
                textEl.textContent = text;
                if (isAnswerRow) {
                    row.classList.add("answer");
                } else {
                    row.classList.add("active");
                }
            } else {
                row.classList.remove("active", "answer");
                textEl.textContent = "";
            }
        }
    }
}