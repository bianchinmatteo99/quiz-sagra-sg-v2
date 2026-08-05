import { IDatabaseAdapter } from "../../database/database.types";
import { AnyFieldsObject } from "./base.admin.contracts";
import { CompleteGameModel } from "./base.admin.model";
import { GameView, GameViewContext } from "./base.admin.view";
import { GameModelContext } from "./base.admin.model";

/** Services required by game controllers to access persistence backends. */
export interface GameControllerContext {
    getDatabase(): IDatabaseAdapter;
}

/**
 * Base coordinator for one game session.
 *
 * Owns model/view wiring, publishes state updates, and provides common admin
 * interaction helpers used by concrete game controllers.
 */
export abstract class GameController<T extends AnyFieldsObject> implements GameViewContext<T>, GameModelContext {
    /** Host context provided by the active game manager. */
    context: GameControllerContext;
    /** Concrete game model instance. */
    abstract model: CompleteGameModel<T>;
    /** Concrete game view instance. */
    abstract view: GameView<T>;

    constructor(ctx: GameControllerContext) {
        this.context = ctx;
    }

    /** Access the shared realtime database adapter. */
    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    /** Persist model state (unless remote) and trigger view re-render. */
    stateUpdated(remote: boolean = false): void {
        if (!remote) this.model.saveToDatabase();
        this.view.render();
    }

    /**
     * Show an admin action prompt and resolve with the selected branch.
     *
     * Resolves true for primary action, false for secondary action, rejects on cancellation.
     */
    async adminInteraction(options: { advanceBtn: string, otherBtn?: string }): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.view.renderFooterChoice(options, (action) => {
                if (action !== null) resolve(action);
                else reject();
            });
        });
    }

    /** Clear view artifacts and remove persisted game-state snapshot. */
    clearAll() {
        this.view.clearViews();
        this.model.clearDatabase();
    }
}