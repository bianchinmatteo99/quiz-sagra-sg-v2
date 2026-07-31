import { Page, StaticPage } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { QDCPGameStateSnapshot, QDCPState } from "./qdcp.contracts";

const QDCP_PALETTE = ["#6f92ca", "#6ca7a1", "#9a7fbe", "#c18586"] as const;

export class QDCPGamePageChooser extends GamePageChooser<QDCPGameStateSnapshot> {
    private mainPage = new QDCPMainPage();

    decide(state: QDCPGameStateSnapshot): Page {
        if (state.state === QDCPState.ASKINGQUESTION) {
            this.mainPage.update(state.displayContents ?? []);
            return this.mainPage;
        }

        this.clear();
        return new QDCPCoverPage();
    }

    clear(): void {
        this.mainPage = new QDCPMainPage();
    }
}

class QDCPCoverPage extends StaticPage {
    templateColumnWidth = "1fr";

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        const words = ["QUANDO", "DOVE", "COME", "PERCHÉ"] as const;
        this.container.id = "qdcp-cover"
        this.container.innerHTML = `
            <style>
                #qdcp-cover {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 0.55rem;
                }
                #qdcp-cover h2 {
                    margin: 0;
                    line-height: 1;
                    letter-spacing: 0.08em;
                    font-size: clamp(1.8rem, 5vw, 4.2rem);
                }
            </style>
            
            ${words.map((word, i) => `<h2 class="step-${i}" style="color: ${QDCP_PALETTE[i]};">${word}</h2>`).join("")}
            
        `;
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
                    gap: 5px;
                    width: 100%;
                    height: 95%;
                }
                #qdcp-main .row {
                    flex: 1 1 0;
                    min-height: auto;
                    border-radius: 14px;
                    background: #ffffff;
                    color: #ffffff;
                    border: 2px solid rgba(0, 0, 0, 0.08);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    text-align: center;
                    line-height: 1.2;
                    transition: background-color 1.5s ease .5s, color 1.5s ease .5s, border-color 1.5s ease .5s;
                }
                #qdcp-main .row.active {
                    border-color: transparent;
                }
                ${QDCP_PALETTE.map((color, i) => `#qdcp-main .row.row-${i}.active { background-color: ${color}; }`).join("\n")}
                #qdcp-main .row.row-4.active {
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

            if (!textEl) continue;

            if (hasText) {
                textEl.textContent = text;
                row.classList.add("active");
            } else {
                row.classList.remove("active");
                textEl.textContent = "";
            }
        }
    }
}