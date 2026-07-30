import { GameDefinition } from "./games.admin.base";
import { GameRequiredData } from "./games.contracts";
import { GuessSongState } from "./guess_song/guess_song.contracts";
import {
    defineFields,
    definition,
    runtime,
    Parsers,
    ValidationError,
    GameDefinitionBuilder,
    GameDefinitionDataFromFields,
    GameModel,
    GameModelContext,
    GameModelProperties,
    GameStateSnapshotFromFields,
} from "./tests.base";

export const GuessSongGameRequiredData = {
    kind: "guess_song",
    name: "Indovina la canzone",
} as const satisfies GameRequiredData;

const fields = defineFields({
    limitTrialsPerSong: definition({
        mdkey: "limit_trials_per_song",
        parser: Parsers.number,
        default: Number.MAX_SAFE_INTEGER,
        validation: (value) => value > 0 ? true : new ValidationError("limit_trials_per_song must be > 0"),
        runtime: true,
        publish: true 
    }),

    stopWhenFirstHandIsRaised: definition({
        mdkey: "stop_when_first_hand_raised",
        parser: Parsers.boolean,
        default: false,
        runtime: true,
        publish: true
    }),

    correctAnswers: definition({
        mdkey: "correct_answers",
        parser: Parsers.stringList,
        runtime: false,
        publish: false
    }),

    pointsForCorrectAnswer: definition({
        mdkey: "points_for_correct_answer",
        parser: Parsers.number,
        validation: (value) => value >= 0 ? true : new ValidationError("points_for_correct_answer must be >= 0"),
        runtime: true,
        publish: true
    }),

    state: runtime({
        default: GuessSongState.STARTING,
        publish: true
    }),

    currentSongIndex: runtime({
        default: GuessSongState.STARTING,
        publish: true
    }),
    
    displayCorrectAnswer: runtime({
        default: "",
        publish: true
    }),
});

export type GuessSongGameDefinitionData = GameDefinitionDataFromFields<
    typeof GuessSongGameRequiredData,
    typeof fields
>;

export type GuessSongGameStateSnapshot = GameStateSnapshotFromFields<
    typeof GuessSongGameRequiredData,
    typeof fields
>;

export class GuessSongGameDefinitionBuilder extends GameDefinitionBuilder<
    typeof GuessSongGameRequiredData,
    typeof fields
> {
    readonly requiredData = GuessSongGameRequiredData;
    readonly fields = fields;
}

export class GuessSongGameModel extends GameModel<
    typeof GuessSongGameRequiredData,
    typeof fields
> {
    readonly fields = fields;
    readonly definition: GameDefinition<GuessSongGameDefinitionData>;

    constructor(ctx: GameModelContext, definition: GameDefinition<GuessSongGameDefinitionData>) {
        super(ctx);
        this.definition = definition;
        this.initModel();
    }

    getSong(i: number): string | null {
        if (i in this.definition.data.correctAnswers) {
            return this.definition.data.correctAnswers[i];
        }
        return null;
    }

    getCurrentSong(): string | null {
        return this.getSong(this.currentSongIndex);
    }
}

export interface GuessSongGameModel extends GameModelProperties<typeof fields> {}

