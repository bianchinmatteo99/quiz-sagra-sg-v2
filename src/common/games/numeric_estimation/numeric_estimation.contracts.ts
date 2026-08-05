import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";

/**
 * Lifecycle states of the Numeric Estimation game.
 */
export enum NumericEstimationState {
    STARTING,
    DISPLAYCOVER,
    ASKINGQUESTION,
    SHOWINGANSWER,
    ENDING,
}

export const NumericEstimationGameRequiredData = {kind: "numeric_estimation", name: "Stima numerica"} as const satisfies GameRequiredData;

/**
 * Persisted configuration for a Numeric Estimation game instance.
 */
export interface NumericEstimationGameDefinitionData extends GameDefinitionData<typeof NumericEstimationGameRequiredData> {
    timeForQuestion: number;
    ifNoCorrectAnswers: ""|"half-points-to-closest"|"linear-decreasing-points";
    questions: string[];
    correctAnswers: string[];
    pointsForCorrectAnswer: number;
}

/**
 * Runtime state snapshot written to `/state/game`.
 */
export interface NumericEstimationGameStateSnapshot extends GameStateSnapshotBase<typeof NumericEstimationGameRequiredData> {
    state: NumericEstimationState;
    currentQuestionIndex: number;
    displayQuestion: string;
    displayCorrectAnswer: string;

    timeForQuestion: number;
    ifNoCorrectAnswers: ""|"half-points-to-closest"|"linear-decreasing-points";
    pointsForCorrectAnswer: number;
}
