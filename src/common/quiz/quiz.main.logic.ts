import { database } from "../../firebase-init";
import { ref, remove } from "firebase/database";
import { QuizStatus, QuizState, Quiz } from "./quiz.definition";
import { showChoiceDialog } from "./ui.utils";

class QuizManager {
    quiz: Quiz | null = null;
    people: any;

    async start(): Promise<void> {
        await this.init();
        document.getElementById("quiz-title")!.textContent = this.quiz?.state.title || "Quiz";
        console.log(this);
    }

    async init(): Promise<void> {
        // Load quiz from both sources if possible
        const databaseState = await QuizState.loadFromDatabase();
        const fileState = await QuizState.loadFromFile();

        // Show dialog with available options
        const choice = await showChoiceDialog(!!databaseState, !!fileState);
        
        if (choice === 'file') {
            // Load from file and delete database quiz
            remove(ref(database, "/"))
            this.quiz = new Quiz(fileState!);
        } else if (choice === 'database-restart') {
            // Load from database and restart
            remove(ref(database, "/"))
            this.quiz = new Quiz(new QuizState(databaseState!.title, databaseState!.games));
        } else if (choice === 'database-continue') {
            // Load from database and continue as is
            this.quiz = new Quiz(databaseState!);
            await this.restoreState();
        }
        // If choice is null, no quiz was selected
    }

    async restoreState(): Promise<void> {
        // Restore current game and question based on quiz state
    }
}

export { QuizManager };

