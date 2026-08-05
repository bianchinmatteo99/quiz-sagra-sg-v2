import { GameDefinition } from "../v2.base/base.admin.definition";
import { GameDefinitionBuilder } from "../v2.base/base.admin.definition";
import { GuessSongDefinitionData, guessSongFields } from "./v2.guess_song.contracts";

/** Concrete runtime definition wrapper for Guess Song field-based payloads. */
export class GuessSongGameDefinition extends GameDefinition<typeof guessSongFields> {}

/** Shape merged into GuessSongGameDefinition instances for direct property access. */
export interface GuessSongGameDefinition extends GuessSongDefinitionData {}

/** Parser/validator for Guess Song definitions from markdown and JSON snapshots. */
export class GuessSongDefinitionBuilder extends GameDefinitionBuilder<typeof guessSongFields> {
    /** Bind builder to the Guess Song schema. */
    constructor() {
        super(guessSongFields);
    }
}