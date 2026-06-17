import { getDatabase } from "firebase/database";
import { QuizDefinition, QuizModel, QuizModelContext, QuizStatus } from "./quiz.model";
import { QuizView, QuizViewContext } from "./quiz.view";
import { IDatabaseAdapter } from "../database/database.types.old";

interface QuizControllerContext {
    getDatabase(): IDatabaseAdapter;
}

class QuizController implements QuizViewContext, QuizModelContext {
    model: QuizModel;
    view: QuizView;
    context: QuizControllerContext;

    constructor(context: QuizControllerContext) {
        this.context = context;
        this.model = new QuizModel(this, QuizDefinition.placeholder());
        this.view = new QuizView(this);
    }

    moveFutureGame(from: number, to: number): void {
        if (from === to) return;
        const updated = [...this.model.futureGamesOrder];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        this.model.futureGamesOrder = updated;
        this.stateUpdated();
    }

    setStatus(status: QuizStatus): void {
        this.model.status = status;
        this.stateUpdated();
    }

    async decideSourceAndLoad(filename: string): Promise<'new' | 'restore' | 'error'> {
        
        const [db, file] = await Promise.all([
            QuizDefinition.loadFromDatabase(this.context.getDatabase()),
            QuizDefinition.loadFromFile(filename)
        ]);

        // Show dialog with available options
        const choice = await this.view.showChoiceDialog(!!db, !!file);
        
        if (choice === 'file' && !!file) {
            // Load from file and delete database quiz
            this.context.getDatabase().remove("/");
            file.saveToDatabase(this.context.getDatabase());
            this.model = new QuizModel(this, file);
            return 'new';
        } else if (choice === 'database-restart' && !!db) {
            // Load from database and restart
            this.context.getDatabase().remove("/");
            db.saveToDatabase(this.context.getDatabase());
            this.model = new QuizModel(this, db);
            return 'new';
        } else if (choice === 'database-continue' && !!db) {
            // Load from database and continue as is
            this.model = new QuizModel(this, db, true);
            // TODO: Implement restore logic
            return 'restore';
        }
        return 'error';
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    stateUpdated(): void {
        this.model.saveToDatabase();
        this.view.render();
    }

}

export { QuizController }
export type { QuizControllerContext }