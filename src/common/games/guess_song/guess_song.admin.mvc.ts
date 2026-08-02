import { Secret } from "../../general.utils";
import { GameController, GameControllerContext, GameModel, GameModelContext, GameView, GameViewContext } from "../games.admin.base";
import { GuessSongGameDefinition } from "./guess_song.admin.definition";
import { GuessSongGameRequiredData, GuessSongGameStateSnapshot, GuessSongState } from "./guess_song.contracts";

/**
 * Runtime state container for a Guess Song game session.
 */
export class GuessSongGameModel extends GameModel<GuessSongGameDefinition, GuessSongGameStateSnapshot> {
    definition: GuessSongGameDefinition;
    state: GuessSongState;
    currentSongIndex: number;
    displayCorrectAnswer: string;
    limitTrialsPerSong: number;
    stopWhenFirstHandIsRaised: boolean;
    pointsForCorrectAnswer: number;

    constructor(ctx: GameModelContext, def: GuessSongGameDefinition) {
        super(ctx);
        this.definition = def;
        this.state = GuessSongState.STARTING;
        this.currentSongIndex = -1;
        this.displayCorrectAnswer = "";
        this.limitTrialsPerSong = def.data.limitTrialsPerSong;
        this.stopWhenFirstHandIsRaised = def.data.stopWhenFirstHandRaised;
        this.pointsForCorrectAnswer = def.data.pointsForCorrectAnswer;
    }

    parseFromJSON(data: Partial<GuessSongGameStateSnapshot>): boolean {
        this.state = data.state ?? GuessSongState.STARTING;
        this.currentSongIndex = data.currentSongIndex ?? -1;
        this.displayCorrectAnswer = data.displayCorrectAnswer ?? "";
        this.limitTrialsPerSong = data.limitTrialsPerSong ?? this.definition.data.limitTrialsPerSong;
        this.stopWhenFirstHandIsRaised = data.stopWhenFirstHandIsRaised ?? this.definition.data.stopWhenFirstHandRaised;
        this.pointsForCorrectAnswer = data.pointsForCorrectAnswer ?? this.definition.data.pointsForCorrectAnswer;
        return true;
    }

    getSong(i: number): string | null {
        if (i in this.definition.data.correctAnswers) {
            return this.definition.data.correctAnswers[i];
        }
        return null;
    }

    getSongAsSecret(i: number): Secret<string> | null {
        const song = this.getSong(i);
        if (!song) return null;
        return new Secret(song, () => "***");
    }

    getCurrentSong(): string | null {
        return this.getSong(this.currentSongIndex);
    }

    toJSON(): GuessSongGameStateSnapshot {
        return {
            ...GuessSongGameRequiredData,
            title: this.definition.data.title,
            state: this.state,
            currentSongIndex: this.currentSongIndex,
            displayCorrectAnswer: this.displayCorrectAnswer,
            limitTrialsPerSong: this.limitTrialsPerSong,
            stopWhenFirstHandIsRaised: this.stopWhenFirstHandIsRaised,
            pointsForCorrectAnswer: this.pointsForCorrectAnswer,
        };
    }
}

/**
 * View context for the Guess Song game.
 */
export interface GuessSongGameViewContext extends GameViewContext<GuessSongGameDefinition> {
    model: GuessSongGameModel;
}

/**
 * Guess Song-specific view implementation.
 */
export class GuessSongGameView extends GameView {
    activeGameContext: GuessSongGameViewContext | null;
    gameDef: GuessSongGameDefinition;

    constructor(ctx: GuessSongGameViewContext | null = null, gameDef: GuessSongGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        this.gameDef = this.readDefinition(ctx, gameDef);
    }

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.data.correctAnswers.map((song, index) => ((s: boolean) => `Canzone ${index + 1}: ${s ? song : "***"}`)),
            "Conclusione",
        ];
    }

    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        const stepCount = this.getSteps().length;
        switch (this.activeGameContext.model.state) {
            case GuessSongState.DISPLAYCOVER:
                if(this.activeGameContext.model.currentSongIndex<0){
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

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const showSecrets = this.canDisplaySecrets();
        const displayedSong = this.activeGameContext.model.displayCorrectAnswer || (this.activeGameContext.model
            .getSongAsSecret(this.activeGameContext.model.currentSongIndex)
            ?.read(showSecrets) ?? "?");

        container.innerHTML = `
            Titolo: ${this.activeGameContext.model.definition.data.title}<br/>
            Stato: ${this.activeGameContext.model.state}<br/>
            Canzone corrente: ${this.activeGameContext.model.currentSongIndex + 1}<br/>
            Risposta corretta: ${displayedSong}
        `;
    }
}

/**
 * Controller for the Guess Song game.
 */
export class GuessSongGameController extends GameController implements GuessSongGameViewContext {
    model: GuessSongGameModel;
    view: GuessSongGameView;

    constructor(ctx: GameControllerContext, def: GuessSongGameDefinition) {
        super(ctx);
        this.model = new GuessSongGameModel(this, def);
        this.view = new GuessSongGameView(this);
    }

    nextSong() : boolean{
        const next = this.model.currentSongIndex+1;
        const nextw = this.model.getSong(next);
        if(!!nextw) {
            this.model.currentSongIndex = next;
            this.stateUpdated();
            return true;
        } else {
            return false;
        }
    }

    displayCorrectAnswer(b : boolean){
        this.model.displayCorrectAnswer = b ? this.model.getCurrentSong()??"" : ""
    }

    setState(s: GuessSongState): void {
        this.displayCorrectAnswer(s===GuessSongState.SHOWINGANSWER)
        this.model.state = s;
        this.stateUpdated();
    }
}
