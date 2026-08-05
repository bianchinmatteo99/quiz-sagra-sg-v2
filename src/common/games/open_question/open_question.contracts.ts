import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";

/**
 * Lifecycle states of the Open Question game.
 */
export enum OpenQuestionState {
    STARTING,
    DISPLAYCOVER,
    ASKINGQUESTION,
    SHOWINGANSWER,
    ENDING,
}

export const OpenQuestionGameRequiredData = {kind: "open_question", name: "Domanda aperta"} as const satisfies GameRequiredData;

/**
 * Persisted configuration for an Open Question game instance.
 */
export interface OpenQuestionGameDefinitionData extends GameDefinitionData<typeof OpenQuestionGameRequiredData> {
    timeForAnswer: number;
    questions: string[];
    correctAnswers: string[];
    pointsForCorrectAnswer: number;
}

/**
 * Runtime state snapshot written to `/state/game`.
 */
export interface OpenQuestionGameStateSnapshot extends GameStateSnapshotBase<typeof OpenQuestionGameRequiredData> {
    state: OpenQuestionState;
    currentQuestionIndex: number;
    displayQuestion: string;
    displayCorrectAnswer: string;

    timeForAnswer: number;
    pointsForCorrectAnswer: number;
}
