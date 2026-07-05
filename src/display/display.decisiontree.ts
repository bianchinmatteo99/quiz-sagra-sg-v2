import { DecisionNode } from "../common/navigation/decisiontree";
import { Page } from "../common/navigation/pages";
import { QuizStatus } from "../common/quiz/quiz.model";
import { DisplayStateHandler } from "./display.state";
import { IdleStatusPage } from "./display.views";

export class DisplayRootPageChooser extends DecisionNode<DisplayStateHandler, Page> {
    name = "root"
    children = {  };
    constructor() {
        super("");
    }
    decide(state: DisplayStateHandler): Page {
        if (!state.read || state.read.app.quiz.status == QuizStatus.Booting || state.read.app.quiz.status == QuizStatus.AwaitingStart) {
            this.clearSubTree();
            return new IdleStatusPage("Pronti per cominciare? Mettetevi comodi!", { bottom_image: IdleStatusPage.DEFAULT_IMAGES.waiting_for_start }, { footer: false });
        } else if (state.read.app.quiz.status == QuizStatus.OnBoarding) {
            return this.delegateDecision("onboard", state);
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