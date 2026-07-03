import { StateHandler } from "../../user/user.state";
import { QuestionUserPageProvider } from "./question.user.base";
import { TextInputQuestionPageProvider } from "./text_input/text_input.question";

export function instantiatePageProviderForQuestion(name: string, state: StateHandler): QuestionUserPageProvider {
    switch(name){
        case "text-input":
            return new TextInputQuestionPageProvider();
        default:
            throw new Error("Page provider for question " + name + " not registered.")
    }
}