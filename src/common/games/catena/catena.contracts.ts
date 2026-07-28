/**
 * Shared Catena contracts and decoder utilities.
 *
 * This module is intentionally frontend-agnostic: it only defines serializable
 * types, enum values, and validation helpers. It is safe to import from any
 * frontend surface (admin, user, display, presenter) because it does not depend
 * on controller, manager, or view runtime classes.
 */

import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";


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

export const CatenaGameRequiredData = {kind: "catena", name: "Reazione a catena"} as const satisfies GameRequiredData

/**
 * Serializable Catena definition payload produced by definition builders.
 *
 * Instances of this shape are persisted under quiz definition data and later
 * consumed by Catena runtime modules through GameDefinition wrappers.
 */
export interface CatenaGameDefinitionData extends GameDefinitionData<typeof CatenaGameRequiredData> {
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
export interface CatenaGameStateSnapshot extends GameStateSnapshotBase<typeof CatenaGameRequiredData> {
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

