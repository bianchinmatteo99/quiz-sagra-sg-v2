import { RankingDiff } from "./people.controller";
import { PeopleModel, PersonRankList } from "./people.model";

export interface PeopleViewContext {
    model: PeopleModel;
    updateRanking: (diff: RankingDiff) => void;
    getPeopleAndRank: () => PersonRankList;
}

export class PeopleView {
    readonly peopleListContainer = "people-list-container";
    context: PeopleViewContext;

    constructor(context: PeopleViewContext) {
        this.context = context;
    }

    render(): void {

    }

}