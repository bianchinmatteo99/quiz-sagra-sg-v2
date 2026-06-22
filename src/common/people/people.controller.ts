import { IDatabaseAdapter } from "../database/database.types";
import { PeopleModel, PeopleModelContext, Person, PersonRankList, Rank } from "./people.model";
import { PeopleView, PeopleViewContext } from "./people.view";

export interface PeopleControllerContext{
    getDatabase(): IDatabaseAdapter
}

export type RankingDiff = Map<string, number>;
export class PeopleController implements PeopleModelContext, PeopleViewContext {
    model: PeopleModel;
    view: PeopleView;
    context: PeopleControllerContext;

    constructor(ctx : PeopleControllerContext){
        this.context = ctx;
        this.model = new PeopleModel(this);
        this.view = new PeopleView(this);
    }

    updateRanking(diff: RankingDiff){
        const everybody = this.model.list.keys();
        const tempList: [string, Rank][] = [];
        for (const id in everybody){
            const update = diff.get(id) ?? 0;
            const current = this.model.ranking.get(id) ?? new Rank();
            const next = new Rank(current.points+update, update, -1, current.position)
            tempList.push([id, next]);
        }
        tempList.sort((a,b)=>b[1].points-a[1].points);
        let pastPoints = Infinity;
        let pos = 0;
        let i = 0;
        for(const [id, rank] of tempList){
            if(rank.points<pastPoints) pos = i+1;
            rank.position = pos;
            this.model.ranking.set(id, rank);
            pastPoints = rank.points;
            i++;
        }
        this.stateUpdated();
    }

    getPeopleAndRank(): PersonRankList{
        const infIfneg = (n:number) => n >= 0 ? n : Infinity;
        const zeroIfNan = (n:number) => Number.isNaN(n) ? 0 : n;
        return this.model.list.entries().map(([id, p])=>{
            return {person: p, rank: this.model.ranking.get(id)??new Rank()}
        }).toArray().sort((a,b)=>{
            return zeroIfNan(infIfneg(a.rank.position)-infIfneg(b.rank.position))
        })
    }

    deletePerson(id: string){
        this.model.list.delete(id);
        this.stateUpdated();
    }
    updatePersonPoints(id: string, points: number){
        const now = this.model.ranking.get(id) ?? new Rank();
        if(now.points==points) return;
        this.updateRanking(new Map([[id, points-now.points]]));
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    stateUpdated(remote: boolean = false): void {
        if(!remote) this.model.saveToDatabase();
        this.view.render(); 
    }
}
