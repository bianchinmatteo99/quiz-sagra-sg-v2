import { GamePresenterStateView } from "../games.presenter.base";
import { OpenQuestionGameDefinitionData, OpenQuestionGameStateSnapshot, OpenQuestionState } from "./open_question.contracts";

export class OpenQuestionGamePresenterStateView extends GamePresenterStateView<OpenQuestionGameDefinitionData, OpenQuestionGameStateSnapshot> {
    render(container: HTMLElement, gameState: Partial<OpenQuestionGameStateSnapshot> | null, showSecrets: boolean): void {
        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? this.gameDefinition.title;

        const settings = document.createElement("div");
        const settingsLines = [
            `Punti per risposta corretta: ${gameState?.pointsForCorrectAnswer ?? this.gameDefinition.pointsForCorrectAnswer}`,
            `Timer risposta (s): ${gameState?.timeForAnswer ?? this.gameDefinition.timeForAnswer}`,
        ];
        settings.textContent = settingsLines.join(" | ");

        const currentQuestionLabel = document.createElement("div");
        const currentQuestionIndex = gameState?.currentQuestionIndex ?? -1;
        const currentQuestion = currentQuestionIndex >= 0
            ? (gameState?.displayQuestion || this.gameDefinition.questions[currentQuestionIndex] || null)
            : null;
        currentQuestionLabel.textContent = currentQuestion
            ? `DOMANDA CORRENTE: ${currentQuestion}`
            : "Nessuna domanda corrente";

        const currentAnswerLabel = document.createElement("div");
        const currentAnswer = currentQuestionIndex >= 0 ? (this.gameDefinition.correctAnswers[currentQuestionIndex] ?? null) : null;
        currentAnswerLabel.textContent = currentAnswer
            ? "RISPOSTA CORRETTA: " + (showSecrets || gameState?.state === OpenQuestionState.SHOWINGANSWER ? currentAnswer.toUpperCase() : "***")
            : "Nessuna risposta corrente";

        container.replaceChildren(title, settings, currentQuestionLabel, currentAnswerLabel);
    }
}
