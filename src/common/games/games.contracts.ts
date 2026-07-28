/**
 * Shared game contracts and lightweight type guards.
 *
 * This module is intentionally dependency-free and contains only serializable
 * shapes plus validation helpers, so it is safe to import from every frontend
 * surface (admin, user, display, and presenter) without pulling in runtime
 * orchestration code.
 */
export interface GameRequiredData {
    /** Discriminator used by registries and concrete game implementations. */
    kind: string;
    /** Human-readable game name shown in UI. */
    name: string;
}

export interface ProvideRequiredData<K extends GameRequiredData = GameRequiredData> {
    /** Discriminator used by registries and concrete game implementations. */
    kind: K["kind"];
    /** Human-readable game name shown in UI. */
    name: K["name"];
}

export interface GameDefinitionData<K extends GameRequiredData = GameRequiredData> extends ProvideRequiredData<K> {
    /** Persisted title. */
    title: string;
}

/** Union-friendly alias for game definitions when a concrete kind is not known. */
export type AnyGameDefinitionData = GameDefinitionData<GameRequiredData>;

/**
 * Base persisted snapshot shape for game runtime state.
 *
 * Concrete game snapshots should extend this contract and add their own
 * state fields while preserving the same identity metadata.
 */
export interface GameStateSnapshotBase<K extends GameRequiredData = GameRequiredData> extends ProvideRequiredData<K> {
    /** Runtime title. */
    title: string;
}

/** Union-friendly alias for game snapshots when a concrete kind is not known. */
export type AnyGameStateSnapshotBase = GameStateSnapshotBase<GameRequiredData>;

