import { QuestionState } from "../common/questions/question.base";
import { instantiatePageProviderForQuestion } from "../common/questions/questions.register";
import { QuizStatus } from "../common/quiz/quiz.model";
import { IdleStatusPage, LoginPage, Page } from "./user.base.views";
import { StateHandler } from "./user.state";

export abstract class DecisionNode<S, T> {
    parentPath: string;
    abstract name: string;
    abstract children: Record<string, DecisionNode<S, T>>;
    abstract decide(state: S): T;
    clear() { }

    constructor(parentPath: string) {
        this.parentPath = parentPath;
    }

    get path() {
        return this.parentPath + ">" + this.name;
    }

    delegateDecision(child: string, state: S): T {
        Object.entries(this.children).filter(([s, dt]) => s != child).forEach(([s, dt]) => dt.clearSubTree());
        return this.children[child].decide(state);
    }

    // called when a parent delegates decision to other child, so that the temporary internal state of previous decision nodes can be cleared
    clearSubTree() {
        Object.values(this.children).forEach(dn => dn.clearSubTree());
        this.clear();
    }
}

export abstract class DecisionLeaf<S, T> extends DecisionNode<S, T> {
    children: Record<string, DecisionNode<S, T>> = {};
    delegateDecision(child: string, state: S): T {
        throw new Error("Leaf cannot delegate decisions");
    }
    clearSubTree(): void {
        this.clear();
    }
}


export class RootPageChooser extends DecisionNode<StateHandler, Page> {
    name = "root"
    children = { "onboard": new LoginPageChooser(this.path), "question": new QuestionPageChooser(this.path) };
    constructor() {
        super("");
    }
    decide(state: StateHandler): Page {
        if (!state.read || state.read.app.quiz.status == QuizStatus.Booting || state.read.app.quiz.status == QuizStatus.AwaitingStart) {
            this.clearSubTree();
            return new IdleStatusPage("Pronti per cominciare? Mettetevi comodi!", { bottom_image: IdleStatusPage.DEFAULT_IMAGES.waiting_for_start }, { footer: false });
        } else if (state.read.app.quiz.status == QuizStatus.OnBoarding) {
            return this.delegateDecision("onboard", state);
        } else if (!state.isLoggedIn() || !state.isRegisteredToQuiz()) {
            return new IdleStatusPage("Il quiz è iniziato; non sono ammessi altri partecipanti", { icon: "person_off" }, { footer: false });
        } else if (state.read.app.quiz.status == QuizStatus.Ended) {
            this.clearSubTree();
            return new IdleStatusPage("Il quiz è terminato! Grazie per aver partecipato!", { icon: "celebration" }, { footer: false });
        } else if (state.read.app.quiz.status == QuizStatus.Idle || state.read.app.question?.state == undefined) {
            this.clearSubTree();
            return new IdleStatusPage("In attesa della prossima domanda...", { bottom_image: IdleStatusPage.DEFAULT_IMAGES.waiting_for_start });
        } else if (state.read.app.quiz.status == QuizStatus.RunningGame && state.read.app.question?.state != undefined) {
            return this.delegateDecision("question", state);
        } else {
            throw new Error("Unexpected state");
        }
    }
}

class LoginPageChooser extends DecisionLeaf<StateHandler, Page> {
    name = "login"
    alreadyLoggedIn = false;
    decide(state: StateHandler): Page {
        if (this.alreadyLoggedIn && state.isRegisteredToQuiz()) {
            state.setCurrentPath(this.path, "already logged in")
            return new IdleStatusPage(`Benvenuta squadra<br/><b>${state.getName()}</b>!`, { icon: "person_check" }, { footer: false });
        } else {
            state.setCurrentPath(this.path, "login page")
            return new LoginPage(state.getName(), (name) => {
                this.alreadyLoggedIn = true;
                state.registerWithName(name);
            })
        }
    }
    clear(): void {
        this.alreadyLoggedIn = false;
    }
}

class QuestionPageChooser extends DecisionLeaf<StateHandler, Page> {
    name = "question"
    alreadyAnswered = false;
    answer : string | null = null;
    decide(state: StateHandler): Page {
        if (!state.read?.app.question) throw new Error("Question state is undefined");
        const question = state.read.app.question;
        const provider = instantiatePageProviderForQuestion(state.read.app.question.name, state);
        if (question.state == QuestionState.SETUP) {
            state.setCurrentPath(this.path, "setup question")
            return provider.whenSetup(state);
        } else if (question.state == QuestionState.ENDED) {
            this.clear();
            state.setCurrentPath(this.path, "end question")
            return new IdleStatusPage("In attesa della prossima domanda...", { bottom_image: IdleStatusPage.DEFAULT_IMAGES.waiting_for_start });
        } else if (question.deny?.includes(state.getUserId()!)) {
            state.setCurrentPath(this.path, "denied answer")
            return provider.whenAnswerDenied(state);
        } else if (question.state == QuestionState.ASKING) {
            if (this.alreadyAnswered) {
                state.setCurrentPath(this.path, "already answered")
                return provider.whenAlreadyAnswered(state);
            } else {
                state.setCurrentPath(this.path, "answering")
                return provider.whenAnswerEnabled(state, (answer) => {
                    this.alreadyAnswered = true;
                    this.answer = answer;
                    state.answerQuestion(answer);
                });
            }
        } else if (question.state == QuestionState.EVALUATING || question.state == QuestionState.IDLE) {
            state.setCurrentPath(this.path, "evaluating")
            return provider.whenEvaluation(state);
        } else if (question.state == QuestionState.SHOWRESULTS) {
            state.setCurrentPath(this.path, "showing results")
            return provider.whenResults(state, state.read.questionresult);
        } else {
            throw new Error("Unexpected question state");
        }
    }
    clear(): void {
        this.alreadyAnswered = false;
        this.answer = null;
    }
}