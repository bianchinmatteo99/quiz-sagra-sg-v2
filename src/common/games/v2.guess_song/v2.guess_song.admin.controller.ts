import { GameController, GameControllerContext } from "../v2.base/base.admin.controller";
import { GuessSongState, guessSongFields } from "./v2.guess_song.contracts";
import { GuessSongGameDefinition } from "./v2.guess_song.admin.definition";
import { GuessSongGameModel } from "./v2.guess_song.admin.model";
import { GuessSongGameView, GuessSongGameViewContext } from "./v2.guess_song.admin.view";

/** Coordinates Guess Song model transitions and admin view updates. */
export class GuessSongGameController extends GameController<typeof guessSongFields> implements GuessSongGameViewContext {
    model: GuessSongGameModel;
    view: GuessSongGameView;

    /** Build model/view wiring for one Guess Song session instance. */
    constructor(ctx: GameControllerContext, def: GuessSongGameDefinition) {
        super(ctx);
        this.model = new GuessSongGameModel(this, def);
        this.view = new GuessSongGameView(this);
    }

    /** Advance to the next song if available and publish the updated state. */
    nextSong(): boolean {
        const next = this.model.currentSongIndex + 1;
        const nextw = this.model.getSong(next);
        if (!!nextw) {
            this.model.currentSongIndex = next;
            this.stateUpdated();
            return true;
        } else {
            return false;
        }
    }

    /** Toggle whether the current correct answer is exposed in clear text. */
    displayCorrectAnswer(b: boolean) {
        this.model.displayCorrectAnswer = b ? this.model.getCurrentSong() ?? "" : "";
    }

    /** Update lifecycle state and synchronize dependent answer-visibility field. */
    setState(s: GuessSongState): void {
        this.displayCorrectAnswer(s === GuessSongState.SHOWINGANSWER);
        this.model.state = s;
        this.stateUpdated();
    }
}