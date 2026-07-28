import { QuizModel } from "./quiz.model";
import { GameStatus, QuizStatus } from "./quiz.contract";
import { toHtml } from "../general.utils";

/**
 * Defines the interface required by the quiz view to interact with quiz state.
 */
interface QuizViewContext {
    model: QuizModel;
    startGame(gameIndex: number): void;
    viewGame(gameIndex: number): void;
    endQuiz(): void;
    stateUpdated(): void;
}

type QuizLoadChoice =
    | { kind: 'example-file' }
    | { kind: 'uploaded-file'; file: File }
    | { kind: 'database-restart' }
    | { kind: 'database-continue' };

/**
 * Responsible for rendering quiz timeline UI and handling quiz actions.
 */
class QuizView {
    readonly quizTimelineContainer = "quiz-timeline-container";
    readonly quizAdvanceButtonContainer = "quiz-advance-button-container";
    readonly changeStartTimeButton = "change-quiz-start-time-button";
    readonly endQuizButton = "end-quiz-button"
    context: QuizViewContext;

    constructor(context: QuizViewContext) {
        this.context = context;
        document.getElementById(this.endQuizButton)?.addEventListener("click", ()=>this.context.endQuiz());
        document.getElementById(this.changeStartTimeButton)?.addEventListener("click", ()=>{
            const newTime = prompt("Scrivi il nuovo orario di inizio:")
            if(!!newTime){
                this.context.model.startTime = newTime;
                this.context.stateUpdated();
            }
        });
    }

    /**
     * Render a single advance button used for admin interactions.
     * @param title Button label.
     * @param callback Callback invoked when the button is clicked.
     */
    renderAdvanceButton(title: string, callback: () => void) {
        const container = document.getElementById(this.quizAdvanceButtonContainer);
        if (!container) return;

        const button = document.createElement('button');
        button.textContent = title;
        button.classList.add("active");
        button.addEventListener("click", () => {
            button.remove();
            callback();
        });

        container.appendChild(button);
    }

    /**
     * Render the quiz games list based on the current model state.
     */
    render(): void {
        const timeline = document.getElementById(this.quizTimelineContainer);
        if (!timeline) return;
        timeline.innerHTML = "";

        const games = this.context.model.definition.games;
        const statuses = this.context.model.gamesStatuses;

        games.forEach((game, index) => {
            timeline.appendChild(this.buildQuizListItem(index, game.data.title ?? game.data.name, statuses[index]));
        });
    }

    setEnableStartTimeChange(enable : boolean){
        const el = document.getElementById(this.changeStartTimeButton)
        if(!el) return;
        el.style.display = enable ? "block" : "none";
    }

    /**
     * Build the HTML element for a single quiz game entry.
     * @param id Game index.
     * @param name Game display name.
     * @param status Current status of the game.
     * @returns Element representing the game list item.
     */
    private buildQuizListItem(id: number, name: string, status: GameStatus): HTMLElement {
        const canStart = (status == GameStatus.NotStarted && this.context.model.status == QuizStatus.Idle);
        const container = toHtml(`
            <article class="quiz-game-list-item ${status == GameStatus.InProgress ? "active" : ""}" id="quiz-game-list-item-${id}" data-id="${id}">
                ${name}
                <footer>
                    <div role="group">
                        <button class="quiz-game-list-item-viewbtn secondary" ${status == GameStatus.Completed ? "disabled" : ""}><span class='material-symbols-outlined'>info</span></button>
                        <button class="quiz-game-list-item-startbtn ${canStart ? "active" : ""}" ${!canStart ? "disabled" : ""}><span class='material-symbols-outlined'>play_arrow</span></button>
                    </div>
                </footer>
            </article>
        `);
        if (status != GameStatus.Completed) {
            const viewButton = container.querySelector(".quiz-game-list-item-viewbtn");
            viewButton?.addEventListener("click", (event) => {
                event.stopPropagation();
                this.context.viewGame(id);
            });
        }

        if (canStart) {
            const startButton = container.querySelector(".quiz-game-list-item-startbtn");
            startButton?.addEventListener("click", (event) => {
                event.stopPropagation();
                this.context.startGame(id);
            });
        }

        return container;
    }

    /**
     * Show the quiz source selection dialog to choose between example file,
     * uploaded file, and database restore options.
     * @param hasDatabase True when a quiz definition exists in the database.
     * @param hasExampleFile True when the bundled example definition file is available.
     * @returns Selected source option or null if the dialog cannot be displayed.
     */
    async showChoiceDialog(hasDatabase: boolean, hasExampleFile: boolean): Promise<QuizLoadChoice | null> {
        return new Promise((resolve) => {
            const dialog = document.querySelector<HTMLDialogElement>('#quiz-choice-dialog');
            if (!dialog) {
                console.error('Quiz choice dialog not found in DOM');
                resolve(null);
                return;
            }

            const uploadInput = document.querySelector<HTMLInputElement>('#quiz-load-uploaded-file');
            const exampleBtn = document.querySelector<HTMLButtonElement>('#quiz-load-example-file');
            const dbContinueBtn = document.querySelector<HTMLButtonElement>('#quiz-load-db-continue');
            const dbRestartBtn = document.querySelector<HTMLButtonElement>('#quiz-load-db-restart');

            if (!uploadInput || !exampleBtn || !dbContinueBtn || !dbRestartBtn) {
                console.error('Quiz choice dialog buttons not found in DOM');
                resolve(null);
                return;
            }

            exampleBtn.disabled = !hasExampleFile;
            dbContinueBtn.disabled = !hasDatabase;
            dbRestartBtn.disabled = !hasDatabase;

            const newUploadInput = uploadInput.cloneNode(true) as HTMLInputElement;
            const newExampleBtn = exampleBtn.cloneNode(true) as HTMLButtonElement;
            const newDbContinueBtn = dbContinueBtn.cloneNode(true) as HTMLButtonElement;
            const newDbRestartBtn = dbRestartBtn.cloneNode(true) as HTMLButtonElement;

            uploadInput.replaceWith(newUploadInput);
            exampleBtn.replaceWith(newExampleBtn);
            dbContinueBtn.replaceWith(newDbContinueBtn);
            dbRestartBtn.replaceWith(newDbRestartBtn);

            let settled = false;
            const finish = (choice: QuizLoadChoice | null): void => {
                if (settled) {
                    return;
                }
                settled = true;
                if (dialog.open) {
                    dialog.close();
                }
                resolve(choice);
            };

            newUploadInput.addEventListener('change', () => {
                const file = newUploadInput.files?.[0];
                if (!file) {
                    return;
                }
                finish({ kind: 'uploaded-file', file });
            });

            newExampleBtn.addEventListener('click', () => {
                finish({ kind: 'example-file' });
            });

            newDbContinueBtn.addEventListener('click', () => {
                finish({ kind: 'database-continue' });
            });

            newDbRestartBtn.addEventListener('click', () => {
                finish({ kind: 'database-restart' });
            });

            dialog.addEventListener('close', () => {
                finish(null);
            }, { once: true });

            dialog.showModal();
        });
    }
}

export { QuizView };
export type { QuizViewContext };