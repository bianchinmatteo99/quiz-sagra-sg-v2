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
    startManualQuestion(options: ManualQuestionOptions): Promise<void>;
    endQuiz(): void;
    stateUpdated(): void;
}

type ManualQuestionKind = 'text-input' | 'raise-hand';

interface ManualQuestionOptions {
    kind: ManualQuestionKind;
    autoCorrectAnswer?: string;
    timer?: number;
    displayResultsTime?: number;
    pointsForCorrectAnswer?: number;
    showRankingOnIdle: boolean;
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
    readonly quizManualStartQuestionButton = "start-manual-question-button";
    readonly endQuizButton = "end-quiz-button"
    readonly reopenUserRegistrationButton = "enable-user-registration-button"
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
        document.getElementById(this.quizManualStartQuestionButton)?.addEventListener("click", ()=>{
            this.showManualQuestionDialog();
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
    setManualStartQuestion(enable : boolean){
        const el = document.getElementById(this.quizManualStartQuestionButton)
        if(!el) return;
        el.style.display = enable ? "block" : "none";
    }
    setReopenUserRegistrationVisibility(visible : boolean){
        const el = document.getElementById(this.reopenUserRegistrationButton)
        if(!el) return;
        el.style.display = visible ? "block" : "none";
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

    async showManualQuestionDialog(): Promise<void> {
        return new Promise((resolve) => {
            const dialog = document.querySelector<HTMLDialogElement>('#manual-question-setup-dialog');
            if (!dialog) {
                console.error('Manual question dialog not found in DOM');
                resolve();
                return;
            }

            const kindSelect = document.querySelector<HTMLSelectElement>('#manual-question-kind');
            const autoCorrectAnswerInput = document.querySelector<HTMLInputElement>('#manual-question-auto-correct-answer');
            const timerInput = document.querySelector<HTMLInputElement>('#manual-question-timer');
            const displayResultsTimeInput = document.querySelector<HTMLInputElement>('#manual-question-display-results-time');
            const pointsInput = document.querySelector<HTMLInputElement>('#manual-question-points');
            const showRankingOnIdleInput = document.querySelector<HTMLInputElement>('#manual-question-show-ranking-on-idle');
            const cancelButton = document.querySelector<HTMLButtonElement>('#question-dialog-cancel');
            const startButton = document.querySelector<HTMLButtonElement>('#question-dialog-start');

            if (!kindSelect || !autoCorrectAnswerInput || !timerInput || !displayResultsTimeInput || !pointsInput || !showRankingOnIdleInput || !cancelButton || !startButton) {
                console.error('Manual question dialog controls not found in DOM');
                resolve();
                return;
            }

            const newKindSelect = kindSelect.cloneNode(true) as HTMLSelectElement;
            const newCancelButton = cancelButton.cloneNode(true) as HTMLButtonElement;
            const newStartButton = startButton.cloneNode(true) as HTMLButtonElement;
            kindSelect.replaceWith(newKindSelect);
            cancelButton.replaceWith(newCancelButton);
            startButton.replaceWith(newStartButton);

            const syncAutoAnswerState = () => {
                const needsAutoAnswer = newKindSelect.value === 'text-input';
                autoCorrectAnswerInput.disabled = !needsAutoAnswer;
                if (!needsAutoAnswer) {
                    autoCorrectAnswerInput.value = '';
                }
            };

            const isIdleQuiz = this.context.model.status === QuizStatus.Idle;
            showRankingOnIdleInput.disabled = !isIdleQuiz;
            showRankingOnIdleInput.checked = false;

            syncAutoAnswerState();
            newKindSelect.addEventListener('change', syncAutoAnswerState);

            const parseOptionalInt = (raw: string, min: number): number | undefined | null => {
                const normalized = raw.trim();
                if (normalized === '') {
                    return undefined;
                }

                const parsed = Number(normalized);
                if (!Number.isInteger(parsed) || parsed < min) {
                    return null;
                }

                return parsed;
            };

            let settled = false;
            const finish = (): void => {
                if (settled) {
                    return;
                }
                settled = true;
                if (dialog.open) {
                    dialog.close();
                }
                resolve();
            };

            newCancelButton.addEventListener('click', () => {
                finish();
            });

            newStartButton.addEventListener('click', async () => {
                const parsedTimer = parseOptionalInt(timerInput.value, 1);
                if (parsedTimer === null) {
                    alert('Timer non valido. Inserire un intero >= 1.');
                    return;
                }

                const parsedDisplayResultsTime = parseOptionalInt(displayResultsTimeInput.value, 0);
                if (parsedDisplayResultsTime === null) {
                    alert('Tempo visualizzazione risultati non valido. Inserire un intero >= 0.');
                    return;
                }

                const parsedPoints = parseOptionalInt(pointsInput.value, 0);
                if (parsedPoints === null) {
                    alert('Punti non validi. Inserire un intero >= 0.');
                    return;
                }

                const kind = newKindSelect.value === 'raise-hand' ? 'raise-hand' : 'text-input';
                const autoAnswer = autoCorrectAnswerInput.value.trim();

                const options: ManualQuestionOptions = {
                    kind,
                    showRankingOnIdle: isIdleQuiz && showRankingOnIdleInput.checked,
                    ...(autoAnswer !== '' && kind === 'text-input' ? { autoCorrectAnswer: autoAnswer } : {}),
                    ...(parsedTimer !== undefined ? { timer: parsedTimer } : {}),
                    ...(parsedDisplayResultsTime !== undefined ? { displayResultsTime: parsedDisplayResultsTime*1000 } : {}),
                    ...(parsedPoints !== undefined ? { pointsForCorrectAnswer: parsedPoints } : {}),
                };

                newStartButton.disabled = true;
                try {
                    this.context.startManualQuestion(options);
                    finish();
                } catch (error) {
                    console.error('Failed to start manual question', error);
                    alert('Errore durante avvio domanda manuale. Controllare la console.');
                } finally {
                    newStartButton.disabled = false;
                }
            });

            dialog.addEventListener('close', () => {
                finish();
            }, { once: true });

            dialog.showModal();
        });
    }
}

export { QuizView };
export type { QuizViewContext, ManualQuestionOptions };