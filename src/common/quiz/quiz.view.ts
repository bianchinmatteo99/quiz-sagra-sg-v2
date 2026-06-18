import { QuizModel, GameStatus } from "./quiz.model";
import { GameDefinition } from "../games/game.base";

interface QuizViewContext {
    model: QuizModel;
    setGameStatus(gameIndex: number, status: GameStatus): void;
    startGame(gameIndex: number): void;
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

        const renderGameItem = (game: GameDefinition, index: number) => {
            const item = document.createElement("div");
            item.className = "quiz-game-item";
            item.dataset.index = String(index);

            const status = statuses[index] ?? GameStatus.NotStarted;
            if (status === GameStatus.InProgress) {
                item.classList.add("current");
            } else if (status === GameStatus.Completed) {
                item.classList.add("completed");
            } else if (status === GameStatus.Disabled) {
                item.classList.add("disabled-status");
            } else {
                item.classList.add("not-started");
            }

            const name = document.createElement("span");
            name.className = "quiz-game-name";
            name.textContent = game.name;
            item.appendChild(name);

            const controls = document.createElement("div");
            controls.className = "quiz-game-actions";

            if (status === GameStatus.NotStarted || status === GameStatus.Disabled) {
                const toggleButton = document.createElement("button");
                toggleButton.type = "button";
                toggleButton.className = "quiz-game-toggle";
                toggleButton.setAttribute("aria-label", status === GameStatus.Disabled ? "Enable game" : "Disable game");
                toggleButton.innerHTML = status === GameStatus.Disabled ? "<span class='material-symbols-outlined'>check_box_outline_blank</span>" : "<span class='material-symbols-outlined'>check_box</span>";
                toggleButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const gameIndex = Number(item.dataset.index);
                    const currentStatus = this.context.model.gamesStatuses[gameIndex];
                    this.context.setGameStatus(gameIndex, currentStatus === GameStatus.Disabled ? GameStatus.NotStarted : GameStatus.Disabled);
                });
                controls.appendChild(toggleButton);
            }

            if (!hasActiveGame && status === GameStatus.NotStarted) {
                const startButton = document.createElement("button");
                startButton.type = "button";
                startButton.className = "quiz-game-start";
                startButton.innerHTML = "<span class='material-symbols-outlined'>play_arrow</span>";
                startButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const gameIndex = Number(item.dataset.index);
                    this.context.startGame(gameIndex);
                });
                controls.appendChild(startButton);
            }

            if (controls.childElementCount > 0) {
                item.appendChild(controls);
            }

            return item;
        };

        games.forEach((game, index) => {
            listContainer.appendChild(renderGameItem(game, index));
        });

        timeline.innerHTML = "";
        timeline.appendChild(listContainer);
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