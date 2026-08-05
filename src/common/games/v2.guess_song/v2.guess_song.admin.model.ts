import { Secret } from "../../general.utils";
import { GameModel, GameModelContext } from "../v2.base/base.admin.model";
import { GuessSongDbData, GuessSongModelData, guessSongFields } from "./v2.guess_song.contracts";
import { GuessSongGameDefinition } from "./v2.guess_song.admin.definition";

/** Runtime model for Guess Song state persisted at /state/game. */
export class GuessSongGameModel extends GameModel<typeof guessSongFields> {
    /** Initialize model state using definition defaults and schema model defaults. */
    constructor(ctx: GameModelContext, def: GuessSongGameDefinition) {
        super(ctx, def, guessSongFields);
    }

    /** Serialize public runtime fields for database persistence. */
    toJSON(): GuessSongDbData {
        return {
            ...this.parseFieldsToDbData()
        };
    }

    /** Hydrate runtime fields from a partial persisted snapshot. */
    parseFromJSON(data: Partial<GuessSongDbData>): boolean {
        const parsed = this.parseFieldsFromDbData(data);
        Object.assign(this, parsed);
        return true;
    }

    /** Return the expected answer for a song index, or null if out of range. */
    getSong(i: number): string | null {
        if (i in this.correctAnswers) {
            return this.correctAnswers[i]!;
        }
        return null;
    }

    /** Return the song answer wrapped as a secret-aware value for UI obfuscation. */
    getSongAsSecret(i: number): Secret<string> | null {
        const song = this.getSong(i);
        if (!song) return null;
        return new Secret(song, () => "***");
    }

    /** Return the expected answer for the currently active song index. */
    getCurrentSong(): string | null {
        return this.getSong(this.currentSongIndex);
    }
}

/** Shape merged into GuessSongGameModel for strongly typed field access. */
export interface GuessSongGameModel extends GuessSongModelData {}