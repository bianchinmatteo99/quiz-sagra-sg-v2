import { GamePresenterStateView } from "../games.presenter.base";
import { NumericEstimationGameDefinitionData, NumericEstimationGameStateSnapshot, NumericEstimationState } from "./numeric_estimation.contracts";

export class NumericEstimationGamePresenterStateView extends GamePresenterStateView<NumericEstimationGameDefinitionData, NumericEstimationGameStateSnapshot> {
    render(container: HTMLElement, gameState: Partial<NumericEstimationGameStateSnapshot> | null, showSecrets: boolean): void {
        const title = document.createElement("h3");
        title.textContent = gameState?.title ?? this.gameDefinition.title;

        const settings = document.createElement("div");
        const settingsLines = [
            `Punti per risposta corretta: ${gameState?.pointsForCorrectAnswer ?? this.gameDefinition.pointsForCorrectAnswer}`,
            `Tempo per domanda: ${gameState?.timeForQuestion ?? this.gameDefinition.timeForQuestion}s`,
            `Politica se nessuna risposta corretta: ${(gameState?.ifNoCorrectAnswers ?? this.gameDefinition.ifNoCorrectAnswers) || "nessuna"}`,
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
            ? "RISPOSTA CORRETTA: " + (showSecrets || gameState?.state === NumericEstimationState.SHOWINGANSWER ? currentAnswer.toUpperCase() : "***")
            : "Nessuna risposta corrente";

        container.replaceChildren(title, settings, currentQuestionLabel, currentAnswerLabel);
    }
}
