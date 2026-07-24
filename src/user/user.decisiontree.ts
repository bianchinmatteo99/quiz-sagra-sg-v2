import { QuestionState } from "../common/questions/question.base";
import { instantiatePageProviderForQuestion } from "../common/questions/questions.register";
import { QuizStatus } from "../common/quiz/quiz.model";
import { IdleStatusPage, LoginPage } from "./user.views";
import { Page } from "../common/navigation/pages";
import { UserStateHandler } from "./user.state";
import { DecisionNode, DecisionLeaf } from "../common/navigation/decisiontree";

/**
 * Root decision node for choosing the current user-facing page.
 *
 * Translates user state into one of the available page flows such as onboarding,
 * question interaction, idle status, or end-of-quiz screens.
 */
export class UserRootPageChooser extends DecisionNode<UserStateHandler, Page> {
    name = "root"
    children = { "onboard": new LoginPageChooser(this.path), "question": new QuestionPageChooser(this.path) };
    constructor() {
        super("");
    }
    /**
     * Choose a page based on current quiz and authentication state.
     */
    decide(state: UserStateHandler): Page {
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

class LoginPageChooser extends DecisionLeaf<UserStateHandler, Page> {
    name = "login"
    alreadyLoggedIn = false;
    /**
     * Choose between the login form and a welcome status page.
     */
    decide(state: UserStateHandler): Page {
        if (this.alreadyLoggedIn) {
            if(state.isRegisteredToQuiz()){
                state.setCurrentPath(this.path, "already logged in")
                return new IdleStatusPage(`Benvenuta squadra<br/><b>${state.getName()}</b>!`, { icon: "person_check" }, { footer: false });
            } else {
                return new IdleStatusPage("Registrazione", {loading: true}, { footer: false })
            }            
        } else {
            state.setCurrentPath(this.path, "login page")
            return new LoginPage(state.getName(), (name) => {
                this.alreadyLoggedIn = true;
                state.registerWithName(name);
                state.scheduleUpdate();
            })
        }
    }
    /**
     * Reset internal login state when the decision subtree is cleared.
     */
    clear(): void {
        this.alreadyLoggedIn = false;
    }
}

/**
 * Decision leaf that selects the current question interaction page.
 */
class QuestionPageChooser extends DecisionLeaf<UserStateHandler, Page> {
    name = "question"
    alreadyAnswered = false;
    answer : string | null = null;
    /**
     * Choose the correct page for the current question lifecycle phase.
     *
     * Tracks whether the user has already answered and routes to setup,
     * evaluation, results, or denial pages as appropriate.
     */
    decide(state: UserStateHandler): Page {
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