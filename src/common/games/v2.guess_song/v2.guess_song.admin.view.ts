import { GameView, GameViewContext } from "../v2.base/base.admin.view";
import { GuessSongState, guessSongFields } from "./v2.guess_song.contracts";
import { GuessSongGameDefinition } from "./v2.guess_song.admin.definition";
import { GuessSongGameModel } from "./v2.guess_song.admin.model";

/** View context exposing the concrete Guess Song model implementation. */
export interface GuessSongGameViewContext extends GameViewContext<typeof guessSongFields> {
    model: GuessSongGameModel;
}

/** Admin-side Guess Song renderer for timeline and current-state sections. */
export class GuessSongGameView extends GameView<typeof guessSongFields> {
    readonly fields = guessSongFields;
    activeGameContext: GuessSongGameViewContext | null;
    gameDef: GuessSongGameDefinition;

    /** Support both active mode (controller context) and static preview mode. */
    constructor(ctx: GuessSongGameViewContext | null = null, gameDef: GuessSongGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        this.gameDef = this.readDefinition(ctx, gameDef);
    }

    /** Build timeline labels for intro, each song round, and completion. */
    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.correctAnswers.map((song, index) => ((s: boolean) => `Canzone ${index + 1}: ${s ? song : "***"}`)),
            "Conclusione",
        ];
    }

    /** Map runtime state to the current timeline step index. */
    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        const stepCount = this.getSteps().length;
        switch (this.activeGameContext.model.state) {
            case GuessSongState.DISPLAYCOVER:
                if (this.activeGameContext.model.currentSongIndex < 0) {
                    return 0;
                }
            case GuessSongState.ASKINGQUESTION:
            case GuessSongState.SHOWINGANSWER:
                return 1 + this.activeGameContext.model.currentSongIndex;
            case GuessSongState.ENDING:
                return stepCount - 1;
            default:
                return 0;
        }
    }

    /** Render admin-facing current-state details and answer visibility. */
    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const showSecrets = this.canDisplaySecrets();
        const displayedSong = this.activeGameContext.model.displayCorrectAnswer || (this.activeGameContext.model
            .getSongAsSecret(this.activeGameContext.model.currentSongIndex)
            ?.read(showSecrets) ?? "?");

        container.innerHTML = this.parseFieldsToAdminCurrentStateView() + `Risposta corretta: ${displayedSong}`;
    }
}