import { IDatabaseAdapter } from "../database/database.types";
import { QuizController, QuizControllerContext } from "./quiz.controller";
import { QuizStatus } from "./quiz.model";

class QuizManager implements QuizControllerContext {
    quiz: QuizController;
    people: any;
    db: IDatabaseAdapter;

    constructor(db: IDatabaseAdapter) {
        this.db = db;
        this.quiz = new QuizController(this);
        console.log(this);
    }

    async boot(filename = "/quiz_def.md"): Promise<void> {
        const policy = await this.quiz.decideSourceAndLoad(filename);
        switch (policy) {
            case 'new':
                console.log("Loaded new quiz from file.");
                this.quiz.setStatus(QuizStatus.AwaitingStart);
                break;
            case 'restore':
                await this.restoreState();
                console.log("Restored quiz from database.");
                break;
            case 'error':
                console.error("Failed to load quiz from both sources.");
                break;
        }
    }

    getDatabase(): IDatabaseAdapter {
        return this.db;
    }

    async restoreState(): Promise<void> {
        // TODO: Restore local models to reflect database state
    }
}

export { QuizManager };

