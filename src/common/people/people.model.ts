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

export type PersonRankList = {person: Person, rank: Rank}[];

export interface PeopleModelContext extends BaseModelContext {

}

export class PeopleModel extends BaseModel {
    readonly DBPATH = new Map([["people", "/people"], ["ranking", "/ranking"]]);
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
        this.setupTwoWayBinding(["people"]);
    }

    parseFromJSON(data: any): boolean {
        try {
            this.allowOnboarding = data.people.allowOnboarding || false;
            this.list = new Map(Object.entries(data.people.list || {}).map(([id, p]) => [id, Person.parseFromJSON(id, p),]));
            this.ranking = new Map(Object.entries(data.ranking || {}).map(([id, r]) => [id, Rank.parseFromJSON(r),]));
            return true;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return false;
        }
    }
    toJSON() {
        return {
            people: {
                allowOnboarding: this.allowOnboarding,
                list: Object.fromEntries([...this.list.entries()].map(([id, person]) => [id, person.toJSON()])),
            },
            ranking: Object.fromEntries([...this.ranking.entries()].map(([id, rank]) => [id, rank.toJSON()])),
        };
    }


}