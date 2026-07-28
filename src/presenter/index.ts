import { FirebaseDatabaseAdapter } from "../common/database/firebase.adapter";
import { createMockState, RealtimeDatabaseRoot } from "../common/database/database.types";
import { GamePresenterStateView } from "../common/games/games.presenter.base";
import { GameDefinitionData } from "../common/games/games.contracts";
import { instantiatePresenterStateViewForGame } from "../common/games/games.presenter.register";
import { PersonRecord } from "../common/people/people.contract";
import { QuestionState } from "../common/questions/question.contract";
import { QuestionAnswersSnapshot, QuestionResultSnapshot } from "../common/questions/question.contract";
import { QuizStatus } from "../common/quiz/quiz.contract";

class TimerView {
    private static readonly HEADER_ACTIONS_ID = "header-actions";
    private static readonly TIMER_ID = "question-timer";

    private readonly timerEl: HTMLElement;
    private endTime: number | null = null;
    private intervalId: number | null = null;

    constructor() {
        const headerActions = document.getElementById(TimerView.HEADER_ACTIONS_ID);
        const timerEl = document.getElementById(TimerView.TIMER_ID);

        if (!headerActions || !timerEl) {
            throw new Error("TimerView richiede #header-actions e #question-timer in index.html");
        }

        headerActions.prepend(timerEl);
        this.timerEl = timerEl;
    }

    render(root: RealtimeDatabaseRoot): void {
        const rawEndTime = root.state?.timerend;
        const nextEndTime = typeof rawEndTime === "number" && rawEndTime > 0 ? rawEndTime : null;
        if (nextEndTime !== this.endTime) {
            this.endTime = nextEndTime;
        }
        this.sync();
    }

    private sync(): void {
        if (this.endTime === null) {
            this.stop();
            this.setInactive();
            return;
        }

        this.updateTick();

        if (this.intervalId === null) {
            this.intervalId = window.setInterval(() => {
                this.updateTick();
            }, 50);
        }
    }

    private updateTick(): void {
        if (this.endTime === null) {
            this.stop();
            this.setInactive();
            return;
        }

        const remainingMs = this.endTime - Date.now();
        if (remainingMs <= 0) {
            this.stop();
            this.setInactive();
            return;
        }

        const remainingSeconds = Math.ceil(remainingMs / 1000);
        this.timerEl.textContent = String(remainingSeconds);
        this.timerEl.classList.add("active");
    }

    private stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private setInactive(): void {
        this.timerEl.textContent = "";
        this.timerEl.classList.remove("active");
    }
}

class QuizGameStateView {
    private static readonly CONTAINER_ID = "quiz-game-current-state";
    private static readonly QUIZ_STATUS_VALUE_ID = "quiz-status-value";
    private static readonly GAME_SPECIFIC_STATE_ID = "game-specific-state";
    private static readonly SECRETS_TOGGLE_ID = "mostra-segreti";
    private static readonly QUIZ_STATUS_LABELS: Record<QuizStatus, string> = {
        [QuizStatus.Booting]: "Avvio",
        [QuizStatus.AwaitingStart]: "In attesa dell'inizio",
        [QuizStatus.OnBoarding]: "Registrazione giocatori",
        [QuizStatus.RunningGame]: "Gioco in corso",
        [QuizStatus.Idle]: "In pausa",
        [QuizStatus.FinalRanking]: "Classifica finale",
        [QuizStatus.Ended]: "Terminato",
    };

    private readonly container: HTMLElement;
    private readonly quizStatusValue: HTMLElement;
    private readonly gameSpecificContainer: HTMLElement;
    private readonly secretToggle: HTMLInputElement;

    constructor() {
        const container = document.getElementById(QuizGameStateView.CONTAINER_ID);
        const quizStatusValue = document.getElementById(QuizGameStateView.QUIZ_STATUS_VALUE_ID);
        const gameSpecificContainer = document.getElementById(QuizGameStateView.GAME_SPECIFIC_STATE_ID);
        const secretToggle = document.getElementById(QuizGameStateView.SECRETS_TOGGLE_ID);

        if (!container || !quizStatusValue || !gameSpecificContainer || !(secretToggle instanceof HTMLInputElement)) {
            throw new Error("QuizGameStateView richiede i contenitori statici in index.html");
        }

        this.container = container;
        this.quizStatusValue = quizStatusValue;
        this.gameSpecificContainer = gameSpecificContainer;
        this.secretToggle = secretToggle;
    }

    render(root: RealtimeDatabaseRoot): void {
        const quiz = root.state?.quiz;
        const gameState = root.state?.game ?? null;
        const gameIndex = typeof quiz?.currentGame === "number" ? quiz.currentGame : null;
        const gameDefinition = gameIndex !== null
            ? (root.definition?.games?.[gameIndex] as GameDefinitionData | undefined) ?? null
            : null;

        let quizStatus = typeof quiz?.status === "number"
            ? QuizGameStateView.QUIZ_STATUS_LABELS[quiz.status as QuizStatus] ?? String(quiz.status)
            : "-";
        if (quiz?.status === QuizStatus.Idle && quiz.displayRankOnIdle) {
            quizStatus = "Classifica";
        }
        this.quizStatusValue.textContent = quizStatus;

        const gameView = gameDefinition ? this.getGameView(gameDefinition) : null;

        if (gameView) {
            gameView.render(this.gameSpecificContainer, gameState, this.secretToggle.checked);
        } else if (gameState) {
            const pre = document.createElement("pre");
            pre.textContent = JSON.stringify(gameState, null, 2);
            this.gameSpecificContainer.replaceChildren(pre);
        } else {
            this.gameSpecificContainer.textContent = "Nessun gioco attivo.";
        }
    }

    onSecretsToggleChange(listener: () => void): void {
        this.secretToggle.addEventListener("change", listener);
    }

    private getGameView(gameDefinition: GameDefinitionData): GamePresenterStateView<GameDefinitionData> | null {
        try {
            const gameView = instantiatePresenterStateViewForGame(gameDefinition);
            return gameView;
        } catch {
            return null;
        }
    }
}

class QuestionStatusAnswersEvaluationView {
    private static readonly CONTAINER_ID = "question-and-answers";
    private static readonly STATUS_ID = "question-status";
    private static readonly TABLE_BODY_ID = "question-answers-body";
    private static readonly QUESTION_STATUS_LABELS: Record<QuestionState, string> = {
        [QuestionState.SETUP]: "PREPARAZIONE",
        [QuestionState.ASKING]: "DOMANDA APERTA",
        [QuestionState.EVALUATING]: "VALUTAZIONE",
        [QuestionState.IDLE]: "IN ATTESA",
        [QuestionState.SHOWRESULTS]: "RISULTATI",
        [QuestionState.ENDED]: "CONCLUSA",
    };

    private readonly container: HTMLElement;
    private readonly statusEl: HTMLElement;
    private readonly tbody: HTMLTableSectionElement;

    constructor() {
        const container = document.getElementById(QuestionStatusAnswersEvaluationView.CONTAINER_ID);
        const statusEl = document.getElementById(QuestionStatusAnswersEvaluationView.STATUS_ID);
        const tbody = document.getElementById(QuestionStatusAnswersEvaluationView.TABLE_BODY_ID);

        if (!container || !statusEl || !(tbody instanceof HTMLTableSectionElement)) {
            throw new Error("QuestionStatusAnswersEvaluationView richiede il contenitore in index.html");
        }

        this.container = container;
        this.statusEl = statusEl;
        this.tbody = tbody;
    }

    render(root: RealtimeDatabaseRoot): void {
        const question = root.state?.question;
        const statusName = typeof question?.state === "number"
            ? QuestionStatusAnswersEvaluationView.QUESTION_STATUS_LABELS[question.state as QuestionState] ?? String(question.state)
            : "-";
        const questionName = question?.name ?? "-";
        this.statusEl.textContent = `${questionName} - ${statusName}`;

        const answers: QuestionAnswersSnapshot = root.results?.answers ?? {};
        const evaluation: QuestionResultSnapshot = root.results?.evaluation ?? {};
        const people: Record<string, PersonRecord> = root.people?.list ?? {};

        const allIds = new Set<string>([...Object.keys(answers), ...Object.keys(evaluation)]);
        const rows = Array.from(allIds).map((id) => {
            const answerEntry = answers[id];
            const evalEntry = evaluation[id];
            const personName = people[id]?.name ?? id;
            const answer = answerEntry?.answer ?? "";
            const time = answerEntry?.time ?? "";
            const evaluationState = typeof evalEntry === "boolean"
                ? (evalEntry ? "correct" : "wrong")
                : "pending";
            return { id, personName, answer, time, evaluationState };
        });

        rows.sort((a, b) => {
            if (a.time === b.time) return a.personName.localeCompare(b.personName);
            if (!a.time) return 1;
            if (!b.time) return -1;
            return a.time.localeCompare(b.time);
        });

        const existing = new Map<string, HTMLTableRowElement>();
        for (const row of Array.from(this.tbody.querySelectorAll("tr"))) {
            const id = row.getAttribute("data-id");
            if (id) existing.set(id, row);
        }

        for (const rowData of rows) {
            let row = existing.get(rowData.id);
            if (!row) {
                row = document.createElement("tr");
                row.setAttribute("data-id", rowData.id);
                for (let i = 0; i < 3; i++) {
                    row.appendChild(document.createElement("td"));
                }
            }
            const cells = row.cells;
            cells[0].textContent = rowData.personName;
            cells[1].textContent = rowData.answer;
            const evaluationIcon = document.createElement("span");
            evaluationIcon.className = `material-symbols-outlined evaluation-icon evaluation-${rowData.evaluationState}`;
            evaluationIcon.textContent = rowData.evaluationState === "correct"
                ? "check_circle"
                : rowData.evaluationState === "wrong"
                    ? "cancel"
                    : "help";
            evaluationIcon.setAttribute("aria-label", rowData.evaluationState === "correct"
                ? "Corretta"
                : rowData.evaluationState === "wrong"
                    ? "Errata"
                    : "In attesa");
            cells[2].replaceChildren(evaluationIcon);
            this.tbody.appendChild(row);
            existing.delete(rowData.id);
        }

        for (const staleRow of existing.values()) {
            staleRow.remove();
        }
    }
}

class RankingView {
    private static readonly CONTAINER_ID = "ranking";
    private static readonly TABLE_BODY_ID = "ranking-body";

    private readonly container: HTMLElement;
    private readonly tbody: HTMLTableSectionElement;

    constructor() {
        const container = document.getElementById(RankingView.CONTAINER_ID);
        const tbody = document.getElementById(RankingView.TABLE_BODY_ID);

        if (!container || !(tbody instanceof HTMLTableSectionElement)) {
            throw new Error("RankingView richiede il contenitore in index.html");
        }

        this.container = container;
        this.tbody = tbody;
    }

    render(root: RealtimeDatabaseRoot): void {
        const people: Record<string, PersonRecord> = root.people?.list ?? {};
        const rankingRows = Object.entries(people).map(([id, person]) => {
            const rank = person.rank;
            return {
                id,
                name: person.name,
                enabledAnswers: person.enabledAnswers && !root.state.question?.deny.includes(id),
                position: rank?.position ?? Number.MAX_SAFE_INTEGER,
                points: rank?.points ?? 0,
                lastUpdate: rank?.lastupdate ?? 0,
            };
        });

        rankingRows.sort((a, b) => {
            if (a.position !== b.position) return a.position - b.position;
            if (a.points !== b.points) return b.points - a.points;
            if (a.lastUpdate !== b.lastUpdate) return b.lastUpdate - a.lastUpdate;
            return a.name.localeCompare(b.name);
        });

        const existing = new Map<string, HTMLTableRowElement>();
        for (const row of Array.from(this.tbody.querySelectorAll("tr"))) {
            const id = row.getAttribute("data-id");
            if (id) existing.set(id, row);
        }

        for (const rowData of rankingRows) {
            let row = existing.get(rowData.id);
            if (!row) {
                row = document.createElement("tr");
                row.setAttribute("data-id", rowData.id);
                for (let i = 0; i < 3; i++) {
                    row.appendChild(document.createElement("td"));
                }
            }
            const cells = row.cells;
            cells[0].textContent = rowData.position === -1 ? "-" : String(rowData.position);
            cells[1].innerHTML = ( rowData.enabledAnswers ? "" : `<span class="material-symbols-outlined">block</span>` )+rowData.name;
            cells[2].textContent = String(rowData.points);
            this.tbody.appendChild(row);
            existing.delete(rowData.id);
        }

        for (const staleRow of existing.values()) {
            staleRow.remove();
        }
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const db = new FirebaseDatabaseAdapter();

    const timerView = new TimerView();
    const quizGameStateView = new QuizGameStateView();
    const questionView = new QuestionStatusAnswersEvaluationView();
    const rankingView = new RankingView();

    let latestRoot: RealtimeDatabaseRoot = createMockState();
    const renderAll = (): void => {
        timerView.render(latestRoot);
        quizGameStateView.render(latestRoot);
        questionView.render(latestRoot);
        rankingView.render(latestRoot);
    };

    quizGameStateView.onSecretsToggleChange(() => {
        renderAll();
    });

    db.onValue<RealtimeDatabaseRoot>("/", (root) => {
        latestRoot = root ?? createMockState();
        renderAll();
    });
});
