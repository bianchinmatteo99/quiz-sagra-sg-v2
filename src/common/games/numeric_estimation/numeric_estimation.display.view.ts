import { Page } from "../../navigation/pages";
import { GamePageChooser } from "../games.display.base";
import { OpenQuestionPage } from "../open_question/open_question.display.view";
import { NumericEstimationGameStateSnapshot, NumericEstimationState } from "./numeric_estimation.contracts";

export class NumericEstimationGamePageChooser extends GamePageChooser<NumericEstimationGameStateSnapshot> {
    decide(state: NumericEstimationGameStateSnapshot): Page {
        let title = state.title;
        let answer = null;

        if (state.state === NumericEstimationState.ASKINGQUESTION || state.state === NumericEstimationState.SHOWINGANSWER) {
            title = state.displayQuestion || state.title;
            answer = state.displayCorrectAnswer ? state.displayCorrectAnswer : "???";
        }

        return new OpenQuestionPage(title, answer);
    }
}


