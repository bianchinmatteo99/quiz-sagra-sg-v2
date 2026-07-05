import { DecisionNode } from "../common/navigation/decisiontree";
import { Page } from "../common/navigation/pages";
import { QuizStatus } from "../common/quiz/quiz.model";
import { DisplayStateHandler } from "./display.state";
import { OnBoardingPage, WaitingStartPage } from "./display.views";

export class DisplayRootPageChooser extends DecisionNode<DisplayStateHandler, Page> {
    name = "root"
    children = {  };
    constructor() {
        super("");
    }
    decide(state: DisplayStateHandler): Page {
        if (!state.read || state.read.app.quiz.status == QuizStatus.Booting || state.read.app.quiz.status == QuizStatus.AwaitingStart) {
            this.clearSubTree();
            return new WaitingStartPage();
        } else if (state.read.app.quiz.status == QuizStatus.OnBoarding){
            this.clearSubTree();
            return new OnBoardingPage();
        } else {
            throw new Error("Unexpected state");
        }
    }
}