import { IdleStatusPage } from "../../user/user.views";
import { EventPage, StaticPage } from "../navigation/pages";
import { UserStateHandler } from "../../user/user.state";

/**
 * Abstract provider for user-facing pages during question lifecycle states.
 *
 * Concrete implementations define the interactive answer page while the
 * shared idle/evaluation/result pages are provided by default.
 */
export abstract class QuestionUserPageProvider {
    /**
     * Render the preparation page shown before the question becomes answerable.
     */
    whenSetup(state: UserStateHandler): StaticPage {
        return new IdleStatusPage("Preparazione domanda", { icon: "hourglass_bottom", loading: true });
    }
    /**
     * Render the interactive answer page for the current question.
     */
    abstract whenAnswerEnabled(state: UserStateHandler, onAnswer: (answer: string) => void): EventPage
    /**
     * Render a page shown when the user is not allowed to answer.
     */
    whenAnswerDenied(state: UserStateHandler): StaticPage {
        return new IdleStatusPage("Non puoi rispondere a questa domanda", { bottom_image: IdleStatusPage.DEFAULT_IMAGES.waiting_for_start, icon: "near_me_disabled" });
    }
    /**
     * Render a page shown when the user has already submitted an answer.
     */
    whenAlreadyAnswered(state: UserStateHandler): StaticPage {
        return new IdleStatusPage("Risposta inviata!", { icon: "send" });
    }
    /**
     * Render the evaluation status page while answers are being graded.
     */
    whenEvaluation(state: UserStateHandler): StaticPage {
        return new IdleStatusPage("Valutazione in corso", { icon: "rate_review", bottom_image: '/img/good-luck.gif' });
    }
    /**
     * Render the results page after the submitted answer has been evaluated.
     *
     * @param state - Current user state handler.
     * @param isCorrect - True when the answer was correct, false when incorrect, or null when no answer was submitted.
     */
    whenResults(state: UserStateHandler, isCorrect: boolean | null): StaticPage {
        if (isCorrect) {
            return new IdleStatusPage("Risposta esatta, complimenti!", { icon: "/img/correct.gif", isGifIcon: true });
        } else if (isCorrect == null) {
            return new IdleStatusPage("Nessuna risposta inviata", { icon: "sentiment_dissatisfied" });
        } else {
            return new IdleStatusPage("Risposta errata", { icon: "/img/wrong.gif", isGifIcon: true });
        }
    }
}