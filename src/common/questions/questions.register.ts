import { UserStateHandler } from "../../user/user.state";
import { QuestionUserPageProvider } from "./question.user.base";
import { TextInputQuestionPageProvider } from "./text_input/text_input.question";

/**
 * Factory used to instantiate the question page provider for a given question type.
 *
 * This centralizes registration and allows the user decision tree to obtain the
 * correct provider implementation for each question name.
 */
export function instantiatePageProviderForQuestion(name: string, state: UserStateHandler): QuestionUserPageProvider {
    switch(name){
        case "text-input":
            return new TextInputQuestionPageProvider();
        default:
            throw new Error("Page provider for question " + name + " not registered.")
    }
}