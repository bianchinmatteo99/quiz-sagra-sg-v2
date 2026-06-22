import { QuizModel, GameStatus } from "./quiz.model";
import { GameDefinition } from "../games/game.base";

interface QuizViewContext {
    model: QuizModel;
    // setGameStatus(gameIndex: number, status: GameStatus): void;
    startGame(gameIndex: number): void;
    viewGame(gameIndex: number): void;
}

function toHtml<T extends HTMLElement>(markup: string): T {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return template.content.firstElementChild as T;
}

class QuizView {
    readonly quizTimelineContainer = "quiz-timeline";
    context: QuizViewContext;

    constructor(context: QuizViewContext) {
        this.context = context;
    }

    render(): void {
        const timeline = document.getElementById(this.quizTimelineContainer);
        if (!timeline) return;

        const listContainer = document.createElement("div");
        listContainer.className = "quiz-game-list";

        const games = this.context.model.definition.games;
        const statuses = this.context.model.gamesStatuses;
        const hasActiveGame = this.context.model.currentGame !== null || statuses.some(status => status === GameStatus.InProgress);

        games.forEach((game, index) => {
            listContainer.appendChild(this.buildQuizListItem(index, game.displayName, statuses[index], hasActiveGame));
        });

        timeline.innerHTML = "";
        timeline.appendChild(listContainer);
    }

    private buildQuizListItem(id: number, name: string, status: GameStatus, hasActiveGame: boolean): HTMLElement {
        const canStart = (status == GameStatus.NotStarted && !hasActiveGame);
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

        if (!hasActiveGame && status === GameStatus.NotStarted) {
            const startButton = container.querySelector(".quiz-game-list-item-startbtn");
            startButton?.addEventListener("click", (event) => {
                event.stopPropagation();
                this.context.startGame(id);
            });
        }

        return container;
    }

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

            // Configure button states
            fileBtn.disabled = !hasFile;
            dbContinueBtn.disabled = !hasDatabase;
            dbRestartBtn.disabled = !hasDatabase;

            // Clear previous event listeners by cloning
            const newFileBtn = fileBtn.cloneNode(true) as HTMLButtonElement;
            const newDbContinueBtn = dbContinueBtn.cloneNode(true) as HTMLButtonElement;
            const newDbRestartBtn = dbRestartBtn.cloneNode(true) as HTMLButtonElement;

            fileBtn.replaceWith(newFileBtn);
            dbContinueBtn.replaceWith(newDbContinueBtn);
            dbRestartBtn.replaceWith(newDbRestartBtn);

            // Attach new event listeners
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