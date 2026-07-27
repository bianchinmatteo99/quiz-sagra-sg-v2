/**
 * Persisted ranking data attached to a person record.
 */
export interface PersonRankSnapshot {
    points: number;
    lastupdate: number;
    position: number;
    lastpos: number;
}

/**
 * Persisted participant record stored under /people/list.<id>.
 */
export interface PersonRecord {
    id?: string;
    name: string;
    rank?: PersonRankSnapshot;
}

/**
 * Persisted people branch stored under /people.
 */
export interface PeopleStateSnapshot {
    allowOnboarding: boolean;
    list?: Record<string, PersonRecord>;
}
