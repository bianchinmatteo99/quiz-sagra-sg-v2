import { QuizStatus } from "../common/quiz/quiz.model";
import { LoadingPage, LoginPage, Page } from "./user.base.views";
import { State, StateHandler } from "./user.state";

abstract class DecisionNode<S,T>{
    parentPath: string;
    abstract name: string;
    abstract children : Record<string, DecisionNode<S,T>>;
    abstract decide(state : S): T;
    clear(){}

    constructor(parentPath : string){
        this.parentPath = parentPath;
    }

    get path(){
        return this.parentPath + ">" + this.name;
    }

    delegateDecision(child: string, state : S): T{
        Object.entries(this.children).filter(([s,dt])=>s!=child).forEach(([s,dt])=>dt.clearSubTree());
        return this.children[child].decide(state);
    }

    // called when a parent delegates decision to other child, so that the temporary internal state of previous decision nodes can be cleared
    clearSubTree(){
        Object.values(this.children).forEach(dn => dn.clearSubTree());
        this.clear();
    }
}

abstract class DecisionLeaf<S,T> extends DecisionNode<S,T>{
    children : Record<string, DecisionNode<S,T>> = {};
    delegateDecision(child: string, state: S): T {
        throw new Error("Leaf cannot delegate decisions");
    }
    clearSubTree(): void {
        this.clear();
    }
}


export class RootPageChooser extends DecisionNode<StateHandler, Page>{
    name = "root"
    children = {"onboard": new LoginPageChooser(this.path)};
    constructor(){
        super("");
    }
    decide(state: StateHandler): Page {
        if(!!state.read && state.read.app.quiz.status==QuizStatus.OnBoarding){
            return this.delegateDecision("onboard", state);
        } else {
            return new LoadingPage("Pronti per cominciare? Mettetevi comodi!");
        }
    }
}

class LoginPageChooser extends DecisionLeaf<StateHandler, Page>{
    name = "login"
    alreadyLoggedIn = false;
    decide(state: StateHandler): Page {
        if(this.alreadyLoggedIn && state.isRegisteredToQuiz()){
            state.setCurrentPath(this.path, "already logged in")
            return new LoadingPage("LoggedIn - Wait start")
        } else {
            state.setCurrentPath(this.path, "login page")
            return new LoginPage(state.getName(), (name)=>{
                this.alreadyLoggedIn = true;
                state.registerWithName(name);
            })
        }
    }
    clear(): void {
        this.alreadyLoggedIn = false;
    }
}