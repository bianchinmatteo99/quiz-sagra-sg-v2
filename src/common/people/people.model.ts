import { BaseModel, BaseModelContext } from "../general.interfaces";

export class Person {
    readonly id: string;
    name: string;
    points: number;
    constructor(id: string, name: string, points: number = 0) {
        this.id = id;
        this.name = name;
        this.points = points;
    }

    static parseFromJSON(data: any) {
        return new Person(data.id, data.name, data.points)
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            points: this.points,
        }
    }
}

export interface PeopleModelContext extends BaseModelContext {

}

export class PeopleModel extends BaseModel {
    readonly DBPATH = "/people";
    context: PeopleModelContext;
    allowOnboarding: boolean;
    list: Person[];

    constructor(ctx: PeopleModelContext) {
        super();
        this.context = ctx;
        this.list = [new Person("test", "Name")]; // TODO: remove mock person definition
        this.allowOnboarding = false;
        this.setupTwoWayBinding();
    }

    parseFromJSON(data: any): boolean {
        try {
            this.allowOnboarding = data.allowOnboarding || false;
            this.list = (data.list || []).map((p : any) => Person.parseFromJSON(p));
            return true;
        } catch (error) {
            console.error('Error parsing quiz from JSON:', error);
            return false;
        }
    }
    toJSON() {
        return {
            allowOnboarding: this.allowOnboarding,
            list: this.list.map(p => p.toJSON())
        };
    }


}