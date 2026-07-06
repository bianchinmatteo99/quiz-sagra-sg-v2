import { BaseModel, BaseModelContext } from "../general.utils";

/**
 * Simple data container representing a person in the system.
 *
 * Purpose: hold identifying information for a user or participant.
 * Responsibilities:
 * - Provide a small serializable representation (`toJSON`).
 * - Construct instances from raw database payloads (`parseFromJSON`).
 */
export class Person {
    readonly id: string;
    name: string;
    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    /**
     * Create a `Person` from a JSON-like object read from the database.
     * @param id - The identifier associated with the person record.
     * @param data - Raw data object from the database (expected to contain `name`).
     * @returns A new `Person` instance.
     */
    static parseFromJSON(id: string, data: any) {
        return new Person(id, data.name)
    }
    /**
     * Serialize the person for persistence or transport.
     * @returns Plain object containing `id` and `name`.
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
        }
    }
}
export class Rank {
    points: number;
    position: number;
    lastupdate: number;
    lastpos: number;

    constructor(points: number = 0, lastupdate: number = 0, position: number = -1, lastpos: number = -1) {
        this.points = points;
        this.lastupdate = lastupdate;
        this.position = position;
        this.lastpos = lastpos;
    }

    /**
     * Parse a `Rank` object from raw stored data.
     * @param data - Raw database object expected to contain `points`, `lastupdate`, `position`, `lastpos`.
     * @returns A new `Rank` instance initialized from `data`.
     */
    static parseFromJSON(data: any) {
        return new Rank(data.points, data.lastupdate, data.position, data.lastpos)
    }

    /**
     * Serialize the rank for storage or transport.
     * @returns Plain object with numeric rank fields.
     */
    toJSON() {
        return {
            points: this.points,
            lastupdate: this.lastupdate,
            position: this.position,
            lastpos: this.lastpos
        }
    }
}

/**
 * Combined view used when rendering or computing leaderboards.
 * Each entry pairs a `Person` with their `Rank`.
 */
export type PersonRankList = { person: Person, rank: Rank }[];

/**
 * Context passed to `PeopleModel` providing database access and state notifications.
 *
 * Extends `BaseModelContext` from `general.utils` and does not add additional
 * required fields for the current implementation, but is kept as a distinct
 * type for future model-specific extensions.
 */
export interface PeopleModelContext extends BaseModelContext {

}

/**
 * Model that manages the collection of known people and their ranks.
 *
 * Responsibilities:
 * - Maintain an in-memory `list` of `Person` instances keyed by id.
 * - Maintain a parallel `ranking` map of `Rank` objects for leaderboard purposes.
 * - Serialize/deserialize its state to/from the database at `DBPATH`.
 * - Optionally enable onboarding (two-way binding) for new users.
 *
 * Persistence:
 * - `DBPATH` is `/people` and holds the persisted model JSON.
 */
export class PeopleModel extends BaseModel {
    readonly DBPATH = "/people";
    context: PeopleModelContext;
    /** Controls whether new users may be created via onboarding flows. */
    allowOnboarding: boolean;
    /** Map of person id => `Person`. */
    list: Map<string, Person>;
    /** Map of person id => `Rank`. */
    ranking: Map<string, Rank>;

    constructor(ctx: PeopleModelContext) {
        super();
        this.context = ctx;
        this.list = new Map();
        this.ranking = new Map();
        this.allowOnboarding = false;
    }

    /**
     * Enable or disable user onboarding and persist the change.
     * When enabling, a realtime two-way binding is created so remote updates
     * will be reflected into the model. When disabling, any active binding is removed.
     * @param b - When true, allow new users and setup two-way DB binding.
     */
    allowNewUsers(b : boolean){
        this.allowOnboarding = b;
        this.saveToDatabase();
        if(b){
            this.setupTwoWayBinding();
        } else {
            this.removeBinding();
        }
    }

    /**
     * Parse persisted people data and populate `list` and `ranking` maps.
     * @param data - Raw object read from the database for the `/people` path.
     * @returns True when parsing succeeded; false on error (and logs the error).
     */
    parseFromJSON(data: any): boolean {
        try {
            this.allowOnboarding = data.allowOnboarding || false;
            const l = new Map();
            const r = new Map();
            for(const [id, p] of (Object.entries<any>(data.list || {}))){
                l.set(id, Person.parseFromJSON(id, p));
                if(!!p.rank){
                    r.set(id, Rank.parseFromJSON(p.rank));
                } else {
                    r.set(id, new Rank());
                }
            }
            this.list = l;
            this.ranking = r;
            return true;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return false;
        }
    }

    /**
     * Serialize the model into a plain object suitable for database storage.
     * The `list` entries include the person JSON plus an attached `rank` object.
     */
    toJSON() {
        return {
            allowOnboarding: this.allowOnboarding,
            list: Object.fromEntries([...this.list.entries()].map(([id, person]) => [id, { ...person.toJSON(), rank: this.ranking.get(id) ?? new Rank() }])),
        };
    }


}