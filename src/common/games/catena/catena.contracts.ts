import { GameStateSnapshotBase, isRecord } from "../games.contracts";

export enum CatenaState {
    STARTING,
    DISPLAYCOVER,
    DISPLAYCHAIN,
    ASKINGQUESTION,
    ENDING,
}

export interface CatenaGameDefinitionData {
    kind: "catena";
    name: string;
    title?: string;
    timeForAnswer: number;
    canRetryForSameWord: boolean;
    words: string[];
    pointsForCorrectAnswer: number;
}

export type CatenaDefinitionData = CatenaGameDefinitionData;

export interface CatenaGameStateSnapshot extends GameStateSnapshotBase {
    kind: "catena";
    state: CatenaState;
    currentWordIndex: number;
    currentWordLetters: number;
    timeForAnswer: number;
    canRetryForSameWord: boolean;
    pointsForCorrectAnswer: number;
    words: string[];
}

export function decodeCatenaGameStateSnapshot(value: unknown): CatenaGameStateSnapshot | null {
    if (!isRecord(value)) {
        return null;
    }

    const kind = value.kind;
    const name = value.name;
    const title = value.title;
    const state = value.state;
    const currentWordIndex = value.currentWordIndex;
    const currentWordLetters = value.currentWordLetters;
    const timeForAnswer = value.timeForAnswer;
    const canRetryForSameWord = value.canRetryForSameWord;
    const pointsForCorrectAnswer = value.pointsForCorrectAnswer;
    const words = value.words;

    if (kind !== "catena") {
        return null;
    }
    if (typeof name !== "string") {
        return null;
    }
    if (title !== undefined && typeof title !== "string") {
        return null;
    }
    if (typeof state !== "number" || !Number.isInteger(state) || state < CatenaState.STARTING || state > CatenaState.ENDING) {
        return null;
    }
    if (typeof currentWordIndex !== "number" || !Number.isInteger(currentWordIndex) || currentWordIndex < 0) {
        return null;
    }
    if (typeof currentWordLetters !== "number" || !Number.isInteger(currentWordLetters) || currentWordLetters < 0) {
        return null;
    }
    if (typeof timeForAnswer !== "number" || Number.isNaN(timeForAnswer)) {
        return null;
    }
    if (typeof canRetryForSameWord !== "boolean") {
        return null;
    }
    if (typeof pointsForCorrectAnswer !== "number" || Number.isNaN(pointsForCorrectAnswer)) {
        return null;
    }
    if (!Array.isArray(words) || words.some((word) => typeof word !== "string")) {
        return null;
    }

    return {
        kind,
        name,
        title,
        state,
        currentWordIndex,
        currentWordLetters,
        timeForAnswer,
        canRetryForSameWord,
        pointsForCorrectAnswer,
        words,
    };
}
