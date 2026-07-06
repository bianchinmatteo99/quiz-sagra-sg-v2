import { IDatabaseAdapter } from "../database/database.types";
import { PeopleModel, PeopleModelContext, Person, PersonRankList, Rank } from "./people.model";
import { PeopleView, PeopleViewContext } from "./people.view";

/**
 * Context required by `PeopleController` to access the database.
 *
 * Typical consumer: `QuizManager` implements this interface and passes
 * itself into the `PeopleController` constructor (see `QuizManager.boot`).
 */
export interface PeopleControllerContext{
    getDatabase(): IDatabaseAdapter
}

/**
 * Oriented map of person id => points delta used to apply ranking updates.
 */
export type RankingDiff = Map<string, number>;


export class PeopleController implements PeopleModelContext, PeopleViewContext {
    /** In-memory model holding people and rank maps. */
    model: PeopleModel;
    /** View responsible for rendering the people list and dialog. */
    view: PeopleView;
    /** External context providing DB access (usually the quiz manager). */
    context: PeopleControllerContext;

    /**
     * Create a `PeopleController` instance.
     * @param ctx - An object implementing `PeopleControllerContext` (e.g. `QuizManager`).
     *
     * Usage within the quiz: `QuizManager` constructs the controller with
     * `this.people = new PeopleController(this)` after it implements
     * `getDatabase()`; thereafter the quiz forwards ranking diffs by calling
     * `QuizManager.updateRanking(diff)` which delegates to `PeopleController.updateRanking`.
     */
    constructor(ctx : PeopleControllerContext){
        this.context = ctx;
        this.model = new PeopleModel(this);
        this.view = new PeopleView(this);
    }

    /**
     * Apply a set of point deltas to all known people and recompute positions.
     * @param diff - Map of person id => points delta to apply.
     */
    updateRanking(diff: RankingDiff){
        const tempList: [string, Rank][] = [];
        for (const id of this.model.list.keys()){
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

    /**
     * Remove a person and their rank from the model and persist the change.
     * @param id - Person identifier to delete.
     */
    deletePerson(id: string){
        this.model.list.delete(id);
        this.model.ranking.delete(id);
        this.stateUpdated();
    }
    /**
     * Set a person's absolute points value. If unchanged, no operation is performed.
     * @param id - Person identifier.
     * @param points - New absolute points value.
     */
    updatePersonPoints(id: string, points: number){
        const now = this.model.ranking.get(id) ?? new Rank();
        if(now.points==points) return;
        this.updateRanking(new Map([[id, points-now.points]]));
    }
    getPeopleList(): Map<string, Person>{
        return this.model.list;
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }
    /**
     * Hook from `BaseModel` (via `PeopleModelContext`) used to persist
     * changes and update the view. The `remote` flag indicates whether the
     * update originated from a database listener; local changes are persisted.
     */
    stateUpdated(remote: boolean = false): void {
        if(!remote) this.model.saveToDatabase();
        this.view.render(); 
    }
}
