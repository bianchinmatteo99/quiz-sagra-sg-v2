import { instantiatePageChooserForGame } from "../common/games/games.display.register";
import { DecisionLeaf, DecisionNode } from "../common/navigation/decisiontree";
import { Page } from "../common/navigation/pages";
import { QuizStatus } from "../common/quiz/quiz.model";
import { DisplayStateHandler } from "./display.state";
import { EmptyPage, FinalRankingPage, GameQuestionColPage, OnBoardingPage, QuestionPage, RankingPage, WaitingStartPage } from "./display.views";

/**
 * Selects the initial display page for the audience screen based on the current quiz state.
 */
export class DisplayRootPageChooser extends DecisionNode<DisplayStateHandler, Page> {
    name = "root"
    children = { "gameorchestrator": new GamePageOrchestrator(this.path) };

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
        } else if (state.read.app.quiz.status == QuizStatus.OnBoarding) {
            this.clearSubTree();
            return new OnBoardingPage();
        } else if (state.read.app.quiz.status == QuizStatus.Idle) {
            this.clearSubTree();
            return new RankingPage();
        } else if (state.read.app.quiz.status == QuizStatus.RunningGame) {
            return this.delegateDecision("gameorchestrator", state)
        } else if (state.read.app.quiz.status == QuizStatus.Ended) {
            this.clearSubTree();
            return new FinalRankingPage();
        } else {
            throw new Error("Unexpected state");
        }
    }
}

export class GamePageOrchestrator extends DecisionNode<DisplayStateHandler, Page> {
    name = "game-orchestrator"
    children = { "gamedelegator": new GamesPageChooserDelegator(this.path), "question": new QuestionPageChooser(this.path) };
    page?: GameQuestionColPage

    decide(state: DisplayStateHandler): Page {
        const gameP = this.children.gamedelegator.decide(state)
        const questionP = this.children.question.decide(state);
        if (!!this.page) {
            this.page.updateWith(gameP, questionP)
        } else {
            this.page = new GameQuestionColPage(gameP, questionP)
        }
        return this.page
    }

    clear(): void {
        this.page = undefined
    }
}

export class GamesPageChooserDelegator extends DecisionNode<DisplayStateHandler, Page> {
    name = "game";
    children: Record<string, DecisionNode<any, Page>> = {};
    decide(state: DisplayStateHandler): Page {
        const gamename = state.read?.app?.game?.name
        if (!gamename) return new EmptyPage()
        if (!(gamename in this.children)) {
            this.children[gamename] = instantiatePageChooserForGame(gamename)
        }
        return this.children[gamename].decide(state.read?.app.game)
    }

    clear(): void {
        this.children = {}
    }
}

export class QuestionPageChooser extends DecisionLeaf<DisplayStateHandler, Page> {
    name: string = "question";
    page?: QuestionPage

    decide(state: DisplayStateHandler): Page {
        const s = state.read?.app.question?.state ?? null
        if (!!this.page) {
            this.page.update(s)
        } else {
            this.page = new QuestionPage(s)
        }
        return this.page
    }

    clear(): void {
        this.page = undefined
    }
}