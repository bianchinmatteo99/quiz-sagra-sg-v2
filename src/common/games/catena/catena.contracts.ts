/**
 * Shared Catena contracts and decoder utilities.
 *
 * This module is intentionally frontend-agnostic: it only defines serializable
 * types, enum values, and validation helpers. It is safe to import from any
 * frontend surface (admin, user, display, presenter) because it does not depend
 * on controller, manager, or view runtime classes.
 */

import { GameStateSnapshotBase, isRecord } from "../games.contracts";


/**
 * Runtime states used by the Catena admin flow.
 *
 * These values drive timeline highlighting and current-state rendering in the
 * Catena view layer.
 */
export enum CatenaState {
    /** Initial construction state before the game is presented. */
    STARTING,
    /** Cover/title screen shown before revealing the chain. */
    DISPLAYCOVER,
    /** Chain overview state between question rounds. */
    DISPLAYCHAIN,
    /** Active question state while participants can answer. */
    ASKINGQUESTION,
    /** Terminal state reached when all words are completed. */
    ENDING,
}

/**
 * Serializable Catena definition payload produced by definition builders.
 *
 * Instances of this shape are persisted under quiz definition data and later
 * consumed by Catena runtime modules through GameDefinition wrappers.
 */
export interface CatenaGameDefinitionData {
    /** Game discriminator used by registries and runtime factories. */
    kind: "catena";
    /** Human-readable game label shown in admin/display views. */
    name: string;
    /** Optional title shown on cover or timeline screens. */
    title?: string;
    /** Per-question timer duration in seconds. */
    timeForAnswer: number;
    /** Whether participants can retry the same word after an incorrect answer. */
    canRetryForSameWord: boolean;
    /** Ordered list of chain words to be played. */
    words: string[];
    /** Points awarded to each participant for a correct answer. */
    pointsForCorrectAnswer: number;
}

/**
 * Persisted Catena runtime snapshot stored under game state paths.
 *
 * This snapshot extends the shared game-state base metadata with Catena-specific
 * progression and gameplay settings required to restore or display state.
 */
export interface CatenaGameStateSnapshot extends GameStateSnapshotBase {
    /** Game discriminator fixed to Catena. */
    kind: "catena";
    /** Current screen state in the Catena lifecycle. */
    state: CatenaState;
    /** Zero-based index of the active word in the chain. */
    currentWordIndex: number;
    /** Number of currently revealed letters for the active word. */
    currentWordLetters: number;
    /** Per-question timer duration in seconds. */
    timeForAnswer: number;
    /** Whether participants can retry the same word after a failure. */
    canRetryForSameWord: boolean;
    /** Score awarded for each correct response. */
    pointsForCorrectAnswer: number;
    /** Current word list representation, possibly masked by reveal state. */
    words: string[];
}

/**
 * Decode unknown input into a validated Catena runtime snapshot.
 *
 * Validation is strict and returns null when any required property is missing
 * or has an incompatible type/value range.
 *
 * @param value Unknown payload read from storage or external input.
 * @returns A fully typed snapshot when valid, otherwise null.
 */
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
