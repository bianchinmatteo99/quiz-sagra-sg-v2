import { IDatabaseAdapter } from "../database/database.types";
import { PeopleModel, PeopleModelContext } from "./people.model";

export interface PeopleControllerContext{
    getDatabase(): IDatabaseAdapter
}

export class PeopleController implements PeopleModelContext { //PeopleViewContext
    model: PeopleModel;
    //view: PeopleView;
    context: PeopleControllerContext;

    constructor(ctx : PeopleControllerContext){
        this.context = ctx;
        this.model = new PeopleModel(this);
    }

    getDatabase(): IDatabaseAdapter {
        return this.context.getDatabase();
    }

    stateUpdated(remote: boolean): void {
        if(!remote) this.model.saveToDatabase();
        // this.view.render();
    }
}
