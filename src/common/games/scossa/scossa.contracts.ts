import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";

export enum ScossaState {
    STARTING,
    DISPLAYCOVER,
    ASKINGQUESTION,
    ENDING,
}

export type ScossaWordDisplay = "wrong" | "correct" | "selected" | "available";

export const ScossaGameRequiredData = { kind: "scossa", name: "Scossa" } as const satisfies GameRequiredData;

export interface ScossaGameDefinitionData extends GameDefinitionData<typeof ScossaGameRequiredData> {
    pointsForCorrectAnswer: number;
    pointsLostForWrongAnswer: number;
    words: string[];
    wrongWords: string[];
}

export interface ScossaGameStateSnapshot extends GameStateSnapshotBase<typeof ScossaGameRequiredData> {
    state: ScossaState;
    pointsForCorrectAnswer: number;
    pointsLostForWrongAnswer: number;
    words: string[];
    displayWords: ScossaWordDisplay[];
}
