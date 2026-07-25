import { FirebaseDatabaseAdapter } from "../common/database/firebase.adapter";
import { RealtimeDatabaseRoot } from "../common/database/database.types";
import { QuestionState } from "../common/questions/question.types";
import { QuizStatus } from "../common/quiz/quiz.types";

class CatenaGameStateView {
    render(container: HTMLElement, gameState: Record<string, unknown> | null, showSecrets: boolean): void {
        if (!gameState) {
            container.textContent = "Nessuno stato gioco disponibile.";
            return;
        }

        const currentWordIndex = typeof gameState.currentWordIndex === "number" ? gameState.currentWordIndex : null;
        const currentWordLetters = typeof gameState.currentWordLetters === "number" ? gameState.currentWordLetters : null;
        const state = typeof gameState.state === "number" ? gameState.state : null;
        const words = Array.isArray(gameState.words) ? gameState.words : [];
        const currentWordRaw = currentWordIndex !== null ? words[currentWordIndex] : null;
        const currentWord = typeof currentWordRaw === "string" ? currentWordRaw : null;

        const list = document.createElement("ul");

        const appendItem = (label: string, value: string): void => {
            const li = document.createElement("li");
            li.textContent = `${label}: ${value}`;
            list.appendChild(li);
        };

        appendItem("Stato catena", state !== null ? String(state) : "n/d");
        appendItem("Parola indice", currentWordIndex !== null ? String(currentWordIndex + 1) : "n/d");
        appendItem("Lettere rivelate", currentWordLetters !== null ? String(currentWordLetters) : "n/d");
        appendItem("Parola corrente", showSecrets ? (currentWord ?? "n/d") : "***");

        container.replaceChildren(list);
    }
}

class QuizGameStateView {
    private readonly gameSpecificContainer: HTMLElement;
    private readonly catenaView = new CatenaGameStateView();

    constructor(private readonly container: HTMLElement, private readonly secretToggle: HTMLInputElement) {
        const gameSpecificContainer = document.createElement("div");
        gameSpecificContainer.id = "game-specific-state";
        this.gameSpecificContainer = gameSpecificContainer;
    }

    render(root: RealtimeDatabaseRoot): void {
        const quiz = root.state?.quiz;
        const definition = root.definition;
        const gameState = (root.state?.game ?? null) as Record<string, unknown> | null;

        const wrapper = document.createElement("div");
        const quizTitle = document.createElement("h3");
        quizTitle.textContent = "Quiz / Game state";
        wrapper.appendChild(quizTitle);

        const details = document.createElement("ul");
        const addDetail = (label: string, value: string): void => {
            const li = document.createElement("li");
            li.textContent = `${label}: ${value}`;
            details.appendChild(li);
        };

        const quizStatus = typeof quiz?.status === "number" ? QuizStatus[quiz.status] ?? String(quiz.status) : "n/d";
        addDetail("Quiz status", quizStatus);

        const currentGame = typeof quiz?.currentGame === "number" ? quiz.currentGame : null;
        addDetail("Current game index", currentGame === null ? "-" : String(currentGame));

        const gameDef = currentGame !== null && definition?.games?.[currentGame] ? definition.games[currentGame] as Record<string, unknown> : null;
        const gameNameFromState = typeof gameState?.name === "string" ? gameState.name : null;
        const gameNameFromDefinition = gameDef && typeof gameDef.name === "string" ? gameDef.name : null;
        const gameName = gameNameFromState ?? gameNameFromDefinition;

        const gameDisplayName = gameDef && typeof gameDef.displayName === "string" ? gameDef.displayName : null;
        addDetail("Current game", gameDisplayName ?? gameName ?? "n/d");

        const allStatuses = Array.isArray(quiz?.gamesStatuses) ? quiz.gamesStatuses : [];
        addDetail("Games total", String(allStatuses.length));

        wrapper.appendChild(details);

        const gameHeader = document.createElement("h4");
        gameHeader.textContent = "Game specific state";
        wrapper.appendChild(gameHeader);
        wrapper.appendChild(this.gameSpecificContainer);

        if (gameName === "catena") {
            this.catenaView.render(this.gameSpecificContainer, gameState, this.secretToggle.checked);
        } else if (gameState) {
            const pre = document.createElement("pre");
            pre.textContent = JSON.stringify(gameState, null, 2);
            this.gameSpecificContainer.replaceChildren(pre);
        } else {
            this.gameSpecificContainer.textContent = "Nessun gioco attivo.";
        }

        this.container.replaceChildren(wrapper);
    }
}

class QuestionStatusAnswersEvaluationView {
    private readonly statusEl: HTMLElement;
    private readonly tbody: HTMLTableSectionElement;

    constructor(container: HTMLElement) {
        const title = document.createElement("h3");
        title.textContent = "Question / Answers / Evaluation";

        const status = document.createElement("p");
        this.statusEl = status;

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        thead.innerHTML = "<tr><th>Team</th><th>Answer</th><th>Time</th><th>Evaluation</th></tr>";
        const tbody = document.createElement("tbody");
        table.append(thead, tbody);
        this.tbody = tbody;

        container.replaceChildren(title, status, table);
    }

    render(root: RealtimeDatabaseRoot): void {
        const question = root.state?.question;
        const statusName = typeof question?.state === "number" ? QuestionState[question.state] ?? String(question.state) : "n/d";
        const questionName = question?.name ?? "n/d";
        this.statusEl.textContent = `Question: ${questionName} | State: ${statusName}`;

        const answers = (root.results?.answers ?? {}) as Record<string, { time: string; answer: string }>;
        const evaluation = (root.results?.evaluation ?? {}) as Record<string, boolean>;
        const people = (root.people?.list ?? {}) as Record<string, { name: string }>;

        const allIds = new Set<string>([...Object.keys(answers), ...Object.keys(evaluation)]);
        const rows = Array.from(allIds).map((id) => {
            const answerEntry = answers[id];
            const evalEntry = evaluation[id];
            const personName = people[id]?.name ?? id;
            const answer = answerEntry?.answer ?? "";
            const time = answerEntry?.time ?? "";
            const evaluationDisplay = typeof evalEntry === "boolean" ? (evalEntry ? "Correct" : "Wrong") : "-";
            return { id, personName, answer, time, evaluationDisplay };
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
                for (let i = 0; i < 4; i++) {
                    row.appendChild(document.createElement("td"));
                }
            }
            const cells = row.cells;
            cells[0].textContent = rowData.personName;
            cells[1].textContent = rowData.answer;
            cells[2].textContent = rowData.time;
            cells[3].textContent = rowData.evaluationDisplay;
            this.tbody.appendChild(row);
            existing.delete(rowData.id);
        }

        for (const staleRow of existing.values()) {
            staleRow.remove();
        }
    }
}

class RankingView {
    private readonly tbody: HTMLTableSectionElement;

    constructor(container: HTMLElement) {
        const title = document.createElement("h3");
        title.textContent = "Ranking";

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        thead.innerHTML = "<tr><th>Pos</th><th>Team</th><th>Points</th><th>Last Δ</th></tr>";
        const tbody = document.createElement("tbody");
        table.append(thead, tbody);
        this.tbody = tbody;

        container.replaceChildren(title, table);
    }

    render(root: RealtimeDatabaseRoot): void {
        const people = (root.people?.list ?? {}) as Record<string, {
            name: string;
            rank?: {
                points: number;
                lastupdate: number;
                position: number;
            };
        }>;
        const rankingRows = Object.entries(people).map(([id, person]) => {
            const rank = person.rank;
            return {
                id,
                name: person.name,
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
                for (let i = 0; i < 4; i++) {
                    row.appendChild(document.createElement("td"));
                }
            }
            const cells = row.cells;
            cells[0].textContent = rowData.position === Number.MAX_SAFE_INTEGER ? "-" : String(rowData.position);
            cells[1].textContent = rowData.name;
            cells[2].textContent = String(rowData.points);
            cells[3].textContent = String(rowData.lastUpdate);
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

    const stateContainer = document.getElementById("quiz-game-current-state");
    const questionContainer = document.getElementById("question-and-answers");
    const rankingContainer = document.getElementById("ranking");
    const secretsToggle = document.getElementById("mostra-segreti") as HTMLInputElement | null;

    if (!stateContainer || !questionContainer || !rankingContainer || !secretsToggle) {
        throw new Error("Presenter containers are missing in index.html");
    }

    const quizGameStateView = new QuizGameStateView(stateContainer, secretsToggle);
    const questionView = new QuestionStatusAnswersEvaluationView(questionContainer);
    const rankingView = new RankingView(rankingContainer);

    let latestRoot: RealtimeDatabaseRoot = {};
    const renderAll = (): void => {
        quizGameStateView.render(latestRoot);
        questionView.render(latestRoot);
        rankingView.render(latestRoot);
    };

    secretsToggle.addEventListener("change", () => {
        renderAll();
    });

    db.onValue<RealtimeDatabaseRoot>("/", (root) => {
        latestRoot = root ?? {};
        renderAll();
    });
});
