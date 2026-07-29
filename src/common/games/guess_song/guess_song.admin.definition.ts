import { MDUtils } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { GuessSongGameDefinitionData, GuessSongGameRequiredData } from "./guess_song.contracts";

/** Convenience alias for a fully-typed Guess Song game definition instance. */
export type GuessSongGameDefinition = GameDefinition<GuessSongGameDefinitionData>;

/**
 * Parses and validates a {@link GuessSongGameDefinitionData} from either a
 * markdown section string or a (potentially partial) JSON object.
 *
 * Registered in `games.admin.register.ts` so that the quiz-definition loader
 * can instantiate the correct builder when it encounters a `guess_song` game
 * section.
 */
export class GuessSongGameDefinitionBuilder implements GameDefinitionBuilder<GuessSongGameDefinitionData> {
    
    /**
     * Parses a Guess Song game definition from a markdown section string.
     *
     * Recognised keys (snake_case as they appear in markdown):
     * - `title` *(optional)* — display title; defaults to `"Indovina la canzone"`.
     * - `limit_trials_per_song` *(optional)* — max answer attempts per song; defaults to `Number.MAX_SAFE_INTEGER` (unlimited).
     * - `stop_when_first_hand_raised` *(optional)* — stops the round when the first participant raises their hand; defaults to `false`.
     * - `points_for_correct_answer` *(required)* — points awarded for a correct answer; must be `>= 0`.
     * - `correct_answers` *(required)* — ordered list of correct answers, one per song; must contain at least one entry.
     *
     * Unknown keys cause a validation error via {@link MDUtils.ensureOnlyAllowedKeys}.
     *
     * @param md - Raw markdown section content for this game block.
     * @returns A fully populated {@link GuessSongGameDefinitionData} object.
     * @throws {Error} If any required key is missing, a value fails its constraint,
     *   or an unrecognised key is present.
     */
    parseFromMD(md: string): GuessSongGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "limit_trials_per_song",
            "stop_when_first_hand_raised",
            "correct_answers",
            "points_for_correct_answer",
        ], "Guess song markdown");

        const title = MDUtils.parseString(parsed, "title", GuessSongGameRequiredData.name);
        const limitTrialsPerSong = MDUtils.parseNumber(parsed, "limit_trials_per_song", Number.MAX_SAFE_INTEGER);
        const stopWhenFirstHandRaised = MDUtils.parseBoolean(parsed, "stop_when_first_hand_raised", false);
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const correctAnswers = MDUtils.parseStringList(parsed, "correct_answers");

        if (limitTrialsPerSong <= 0) {
            throw new Error(`Guess song key \"limit_trials_per_song\" must be > 0, received ${limitTrialsPerSong}`);
        }
        if (pointsForCorrectAnswer < 0) {
            throw new Error(`Guess song key \"points_for_correct_answer\" must be >= 0, received ${pointsForCorrectAnswer}`);
        }
        if(correctAnswers.length < 1){
            throw new Error(`Guess song key \"correct_answers\" must have at least 1 item in the list, received ${correctAnswers.length}`);
        }

        return {
            ...GuessSongGameRequiredData,
            title,
            limitTrialsPerSong,
            stopWhenFirstHandRaised,
            correctAnswers,
            pointsForCorrectAnswer,
        };
    }

    /**
     * Deserialises a {@link GuessSongGameDefinitionData} from a plain object,
     * typically read from `/definition` in the Firebase Realtime Database.
     *
     * Missing fields are replaced with safe defaults so that data written by an
     * older version of the app can still be loaded correctly:
     * - `title` → `"Indovina la canzone"`
     * - `limitTrialsPerSong` → `Number.MAX_SAFE_INTEGER` (unlimited)
     * - `stopWhenFirstHandRaised` → `false`
     * - `correctAnswers` → `[]`
     * - `pointsForCorrectAnswer` → `10`
     *
     * @param data - Partial JSON object to deserialise.
     * @returns A fully populated {@link GuessSongGameDefinitionData} object.
     */
    parseFromJSON(data: Partial<GuessSongGameDefinitionData>): GuessSongGameDefinitionData {
        return {
            ...GuessSongGameRequiredData,
            title: data.title ?? GuessSongGameRequiredData.name,
            limitTrialsPerSong: data.limitTrialsPerSong ?? Number.MAX_SAFE_INTEGER,
            stopWhenFirstHandRaised: data.stopWhenFirstHandRaised ?? false,
            correctAnswers: data.correctAnswers ?? [],
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
        };
    }
}
