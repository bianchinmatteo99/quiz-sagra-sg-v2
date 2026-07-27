/**
 * Persisted display-specific state stored under /state/display.
 */
export interface DisplayStateSnapshot {
    /** Optional ranking cutoff used by display screens. */
    rankingupto?: number | null;
}
