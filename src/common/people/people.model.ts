import { BaseModel, BaseModelContext } from "../general.utils";

export class Person {
    readonly id: string;
    name: string;
    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    static parseFromJSON(id: string, data: any) {
        return new Person(id, data.name)
    }
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

    static parseFromJSON(data: any) {
        return new Rank(data.points, data.lastupdate, data.position, data.lastpos)
    }
    toJSON() {
        return {
            points: this.points,
            lastupdate: this.lastupdate,
            position: this.position,
            lastpos: this.lastpos
        }
    }
}

export type PersonRankList = { person: Person, rank: Rank }[];

export interface PeopleModelContext extends BaseModelContext {

}

export class PeopleModel extends BaseModel {
    readonly DBPATH = "/people";
    context: PeopleModelContext;
    allowOnboarding: boolean;
    list: Map<string, Person>;
    ranking: Map<string, Rank>;

    constructor(ctx: PeopleModelContext) {
        super();
        this.context = ctx;
        this.list = new Map([["test", new Person("test", "Name")]]); // TODO: remove mock person definition
        this.ranking = new Map([["test", new Rank()]]);
        this.allowOnboarding = false;
    }

    allowNewUsers(b : boolean){
        this.allowOnboarding = b;
        this.saveToDatabase();
        if(b){
            this.setupTwoWayBinding();
        } else {
            this.removeBinding();
        }
    }

    parseFromJSON(data: any): boolean {
        try {
            this.allowOnboarding = data.allowOnboarding || false;
            const l = new Map();
            const r = new Map();
            for(const [id, p] of (data.list || {})){
                l.set(id, Person.parseFromJSON(id, p));
                r.set(id, Rank.parseFromJSON(p.rank));
            }
            this.list = l;
            this.ranking = r;
            return true;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return false;
        }
    }
    toJSON() {
        return {
            allowOnboarding: this.allowOnboarding,
            list: Object.fromEntries([...this.list.entries()].map(([id, person]) => [id, { ...person.toJSON(), rank: this.ranking.get(id) ?? new Rank() }])),
        };
    }


}