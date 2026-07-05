import { IdleStatusPage } from "../../user/user.views";
import { EventPage, StaticPage } from "../navigation/pages";
import { StateHandler } from "../../user/user.state";

export abstract class QuestionUserPageProvider {
    whenSetup(state: StateHandler): StaticPage {
        return new IdleStatusPage("Preparazione domanda", { icon: "hourglass_bottom", loading: true });
    }
    abstract whenAnswerEnabled(state: StateHandler, onAnswer: (answer: string) => void): EventPage
    whenAnswerDenied(state: StateHandler): StaticPage {
        return new IdleStatusPage("Non puoi rispondere a questa domanda", { bottom_image: IdleStatusPage.DEFAULT_IMAGES.waiting_for_start, icon: "near_me_disabled" });
    }
    whenAlreadyAnswered(state: StateHandler): StaticPage {
        return new IdleStatusPage("Risposta inviata!", { icon: "send" });
    }
    whenEvaluation(state: StateHandler): StaticPage {
        return new IdleStatusPage("Valutazione in corso", { icon: "rate_review", bottom_image: '/img/good-luck.gif' });
    }
    whenResults(state: StateHandler, isCorrect: boolean | null): StaticPage {
        if (isCorrect) {
            return new IdleStatusPage("Risposta esatta, complimenti!", { icon: "/img/correct.gif", isGifIcon: true });
        } else if (isCorrect == null) {
            return new IdleStatusPage("Nessuna risposta inviata", { icon: "sentiment_dissatisfied" });
        } else {
            return new IdleStatusPage("Risposta errata", { icon: "/img/wrong.gif", isGifIcon: true });
        }
    }
}