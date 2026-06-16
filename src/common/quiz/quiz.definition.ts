import { database } from "../../firebase-init";
import { ref, get, onValue, set, update, remove, off } from "firebase/database";
import { existingGames, Game } from "../games/games.definition";

enum QuizStatus {
    Booting, // Loading quiz definition and setting up the database
    AwaitingStart, // Waiting for the host to start the quiz
    OnBoarding, // Players are joining and setting up their profiles
    RunningGame, // A game is currently running
    Idle, // No game is running, but the quiz is active (e.g. between games)
    Ended, // The quiz has ended
}
    
class QuizState {
    title: string;
    games: Game[];
    pastGamesOrder: number[];
    futureGamesOrder: number[];
    status: QuizStatus;
    currentGame: number | null;

    constructor(title: string, games: Game[]) {
        this.title = title;
        this.games = games;
        this.pastGamesOrder = [];
        this.futureGamesOrder = [...Array(games.length).keys()]; // Default order is sequential
        this.status = QuizStatus.Booting;
        this.currentGame = null;
    }

    static async loadFromFile(): Promise<QuizState | null> {
        // Load quiz definition from a JSON file and initialize state
        const response = await fetch("/quiz_def.md");
        try {
            const text = await response.text();
            return QuizState.parseFromMD(text);
        } catch (error) {
            console.error('Error loading quiz from file:', error);
            return null;
        }
    }

    static async loadFromDatabase(): Promise<QuizState | null> {
        // Load quiz definition from the database and initialize state
        try {
            const snapshot = await get(ref(database, "/quiz"));
            const data = snapshot.val();
            if (data) {
                return QuizState.parseFromJSON(data);
            }
        } catch (error) {
            console.error('Error loading quiz from database:', error);
        }
        return null;
    }

    async saveToDatabase(): Promise<void> {
        // Save the current quiz state to the database
        try {
            await set(ref(database, "/quiz"), this.toJSON());
        } catch (error) {
            console.error('Error saving quiz to database:', error);
        }
    }

    static parseFromMD(md: string): QuizState | null {
        // Parse quiz definition from Markdown text
        try {
            const lines = md.split(/\r?\n/);
            const titleLineIndex = lines.findIndex(line => line.trim().startsWith("# "));
            if (titleLineIndex < 0) throw new Error("Quiz definition missing title");
            const title = lines[titleLineIndex].trim().substring(2).trim();

            const gameSections: string[] = [];
            let currentSection: string[] = [];

            for (let i = titleLineIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim().startsWith("## ")) {
                    if (currentSection.length > 0) {
                        gameSections.push(currentSection.join("\n"));
                    }
                    currentSection = [line];
                } else if (currentSection.length > 0) {
                    currentSection.push(line);
                }
            }

            if (currentSection.length > 0) {
                gameSections.push(currentSection.join("\n"));
            }

            if (gameSections.length === 0) throw new Error("Quiz definition contains no game sections");

            const games = gameSections.map(section => {
                const sectionLines = section.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
                const header = sectionLines[0] || "";
                const gameTitle = header.startsWith("## ") ? header.substring(3).trim().toLowerCase() : "";
                if (!(gameTitle in existingGames)) throw new Error(`Unknown game type: ${gameTitle}`);
                return existingGames[gameTitle].parseFromMD(section);
            });

            return new QuizState(title, games);
        } catch (error) {
            console.error('Error parsing quiz from Markdown:', error);
            return null;
        }
    }

    static parseFromJSON(data: any): QuizState | null {
        // Parse quiz definition from JSON data
        try {
            const title = data.title;
            const games = (data.games || []).map((gameData: any) => {
                if (!gameData.name) throw new Error("Game data missing 'name' property");
                if (!(gameData.name in existingGames)) throw new Error(`Unknown game type: ${gameData.name}`);
                return existingGames[gameData.name as string].parseFromJSON(gameData);
            });
            const quizState = new QuizState(title, games);
            quizState.pastGamesOrder = data.pastGamesOrder ?? [];
            quizState.futureGamesOrder = data.futureGamesOrder ?? [...Array(games.length).keys()];
            quizState.status = data.status || QuizStatus.Booting;
            quizState.currentGame = data.currentGame || null;
            return quizState;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return null;
        }
    }

    toJSON(): any {
        // Convert quiz state to JSON for saving to the database
        return {
            title: this.title,
            games: this.games.map(game => game.toJSON()),
            pastGamesOrder: this.pastGamesOrder,
            futureGamesOrder: this.futureGamesOrder,
            status: this.status,
            currentGame: this.currentGame,
        };
    }
}

class Quiz {
    state: QuizState;

    constructor(state: QuizState) {
        this.state = state;
        this.state.saveToDatabase();
        this.render();
    }

    render(): void {
        const timeline = document.getElementById("quiz-timeline");
        if (!timeline) return;

        const currentGameId = this.state.currentGame;
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

        const moveFutureGame = (from: number, to: number): void => {
            if (from === to) return;
            const updated = [...this.state.futureGamesOrder];
            const [moved] = updated.splice(from, 1);
            updated.splice(to, 0, moved);
            this.state.futureGamesOrder = updated;
            this.render();
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

            moveFutureGame(sourcePosition, targetPosition);
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

        this.state.pastGamesOrder.forEach((gameIndex) => {
            const game = this.state.games[gameIndex];
            listContainer.appendChild(renderGameItem(game, null, "past"));
        });

        if (currentGameId !== null && this.state.games[currentGameId]) {
            const currentGame = this.state.games[currentGameId];
            listContainer.appendChild(renderGameItem(currentGame, null, "current"));
        }

        this.state.futureGamesOrder.forEach((gameIndex, position) => {
            const game = this.state.games[gameIndex];
            listContainer.appendChild(renderGameItem(game, position, "future"));
        });

        timeline.innerHTML = "";
        timeline.appendChild(listContainer);
    }

}

export { QuizStatus, QuizState, Quiz };