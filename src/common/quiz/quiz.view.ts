import { QuizModel, GameStatus, QuizStatus } from "./quiz.model";
import { toHtml } from "../general.utils";

/**
 * Defines the interface required by the quiz view to interact with quiz state.
 */
interface QuizViewContext {
    model: QuizModel;
    startGame(gameIndex: number): void;
    viewGame(gameIndex: number): void;
}

/**
 * Responsible for rendering quiz timeline UI and handling quiz actions.
 */
class QuizView {
    readonly quizTimelineContainer = "quiz-timeline-container";
    readonly quizAdvanceButtonContainer = "quiz-advance-button-container";
    context: QuizViewContext;

    constructor(context: QuizViewContext) {
        this.context = context;
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
            timeline.appendChild(this.buildQuizListItem(index, game.displayName, statuses[index]));
        });
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
     * Show the quiz source selection dialog to choose between file load or database restore.
     * @param hasDatabase True when a quiz definition exists in the database.
     * @param hasFile True when a definition file is available.
     * @returns Selected source option or null if the dialog cannot be displayed.
     */
    async showChoiceDialog(hasDatabase: boolean, hasFile: boolean): Promise<'file' | 'database-restart' | 'database-continue' | null> {
        return new Promise((resolve) => {
            const dialog = document.querySelector<HTMLDialogElement>('#quiz-choice-dialog');
            if (!dialog) {
                console.error('Quiz choice dialog not found in DOM');
                resolve(null);
                return;
            }

            const fileBtn = document.querySelector<HTMLButtonElement>('#quiz-load-file');
            const dbContinueBtn = document.querySelector<HTMLButtonElement>('#quiz-load-db-continue');
            const dbRestartBtn = document.querySelector<HTMLButtonElement>('#quiz-load-db-restart');

            if (!fileBtn || !dbContinueBtn || !dbRestartBtn) {
                console.error('Quiz choice dialog buttons not found in DOM');
                resolve(null);
                return;
            }

            fileBtn.disabled = !hasFile;
            dbContinueBtn.disabled = !hasDatabase;
            dbRestartBtn.disabled = !hasDatabase;

            const newFileBtn = fileBtn.cloneNode(true) as HTMLButtonElement;
            const newDbContinueBtn = dbContinueBtn.cloneNode(true) as HTMLButtonElement;
            const newDbRestartBtn = dbRestartBtn.cloneNode(true) as HTMLButtonElement;

            fileBtn.replaceWith(newFileBtn);
            dbContinueBtn.replaceWith(newDbContinueBtn);
            dbRestartBtn.replaceWith(newDbRestartBtn);

            newFileBtn.addEventListener('click', () => {
                dialog.close();
                resolve('file');
            });

            newDbContinueBtn.addEventListener('click', () => {
                dialog.close();
                resolve('database-continue');
            });

            newDbRestartBtn.addEventListener('click', () => {
                dialog.close();
                resolve('database-restart');
            });

            dialog.showModal();
        });
    }
}

export { QuizView };
export type { QuizViewContext };