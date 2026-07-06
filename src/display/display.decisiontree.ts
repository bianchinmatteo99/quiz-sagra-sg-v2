import { DecisionNode } from "../common/navigation/decisiontree";
import { Page } from "../common/navigation/pages";
import { QuizStatus } from "../common/quiz/quiz.model";
import { DisplayStateHandler } from "./display.state";
import { OnBoardingPage, WaitingStartPage } from "./display.views";

/**
 * Selects the initial display page for the audience screen based on the current quiz state.
 */
export class DisplayRootPageChooser extends DecisionNode<DisplayStateHandler, Page> {
    name = "root"
    children = {  };

    /**
     * Creates the root decision node with no parent path.
     */
    constructor() {
        super("");
    }

    /**
     * Chooses the appropriate page for the current display state.
     *
     * @param state The reactive display state exposed by the state handler.
     * @returns The page that should be rendered for the current quiz phase.
     */
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