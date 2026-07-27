import { UserStateHandler } from "../../user/user.state";
import { QuestionUserPageProvider } from "./questions.user.base";
import { TextInputQuestionPageProvider } from "./text_input/text_input.question.user";

/**
 * Factory used to instantiate the user question page provider for a question kind.
 *
 * This centralizes provider registration so the user decision flow can map the
 * `name` persisted in `/state/question` to a concrete `QuestionUserPageProvider`.
 *
 * To register a new question kind, add a corresponding `case` branch that
 * returns the new provider implementation.
 *
 * @param name Question kind identifier (for example `text-input`).
 * @param state Current user state handler passed by the decision tree.
 * Currently unused by this registry function but kept for API consistency.
 * @returns Provider instance used to render question pages for the user app.
 * @throws Error When no provider is registered for `name`.
 */
export function instantiatePageProviderForQuestion(name: string, state: UserStateHandler): QuestionUserPageProvider {
    switch(name){
        case "text-input":
            return new TextInputQuestionPageProvider();
        default:
            throw new Error("Page provider for question " + name + " not registered.")
    }
}