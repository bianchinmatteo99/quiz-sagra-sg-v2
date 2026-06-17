import { QuizModel } from "./quiz.model";
import { Game } from "../games/game.base";

interface QuizViewContext {
    model: QuizModel;
    moveFutureGame(from: number, to: number): void;
}

class QuizView {
    context: QuizViewContext;

    constructor(context: QuizViewContext) {
        this.context = context;
    }

    render(): void {
        const timeline = document.getElementById("quiz-timeline");
        if (!timeline) return;

        const currentGameId = this.context.model.currentGame;
        const listContainer = document.createElement("div");
        listContainer.className = "quiz-game-list";

        let dragSourcePosition: number | null = null;

        const handleDragStart = (event: DragEvent) => {
            const target = event.currentTarget as HTMLElement | null;
            if (!target) return;
            dragSourcePosition = Number(target.dataset.position);
            event.dataTransfer?.setData("text/plain", String(dragSourcePosition));
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
            }
        };

        const handleDragOver = (event: DragEvent) => {
            event.preventDefault();
            if (!(event.currentTarget instanceof HTMLElement)) return;
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
            }
            event.currentTarget.classList.add("drag-over");
        };

        const handleDragLeave = (event: DragEvent) => {
            if (event.currentTarget instanceof HTMLElement) {
                event.currentTarget.classList.remove("drag-over");
            }
        };

        const handleDrop = (event: DragEvent) => {
            event.preventDefault();
            const target = event.currentTarget as HTMLElement | null;
            if (!target) return;
            target.classList.remove("drag-over");
            const targetPosition = Number(target.dataset.position);
            const sourcePosition = dragSourcePosition !== null
                ? dragSourcePosition
                : Number(event.dataTransfer?.getData("text/plain"));

            if (Number.isNaN(sourcePosition) || Number.isNaN(targetPosition) || sourcePosition === targetPosition) {
                return;
            }

            this.context.moveFutureGame(sourcePosition, targetPosition);
        };

        const handleDragEnd = (): void => {
            listContainer.querySelectorAll(".drag-over").forEach(item => item.classList.remove("drag-over"));
            dragSourcePosition = null;
        };

        const renderGameItem = (game: Game, position: number | null, stateType: "past" | "current" | "future") => {
            const item = document.createElement("div");
            item.className = "quiz-game-item";
            if (stateType === "current") {
                item.classList.add("current");
                item.classList.add("disabled");
            } else if (stateType === "past") {
                item.classList.add("past");
                item.classList.add("disabled");
            } else {
                item.classList.add("draggable");
                item.draggable = true;
                item.dataset.position = String(position);
                item.addEventListener("dragstart", handleDragStart);
                item.addEventListener("dragover", handleDragOver);
                item.addEventListener("dragleave", handleDragLeave);
                item.addEventListener("drop", handleDrop);
                item.addEventListener("dragend", handleDragEnd);
            }
            item.textContent = game.name; // You can customize this to show more game details
            return item;
        };

        this.context.model.pastGamesOrder.forEach((gameIndex) => {
            const game = this.context.model.games[gameIndex];
            listContainer.appendChild(renderGameItem(game, null, "past"));
        });

        if (currentGameId !== null && this.context.model.games[currentGameId]) {
            const currentGame = this.context.model.games[currentGameId];
            listContainer.appendChild(renderGameItem(currentGame, null, "current"));
        }

        this.context.model.futureGamesOrder.forEach((gameIndex, position) => {
            const game = this.context.model.games[gameIndex];
            listContainer.appendChild(renderGameItem(game, position, "future"));
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