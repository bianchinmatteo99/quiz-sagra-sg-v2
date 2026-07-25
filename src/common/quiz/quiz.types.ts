/**
 * Lifecycle states for the quiz as a whole.
 */
export enum QuizStatus {
    Booting, // Loading quiz definition and setting up the database
    AwaitingStart, // Waiting for the host to start the quiz
    OnBoarding, // Players are joining and setting up their profiles
    RunningGame, // A game is currently running
    Idle, // No game is running, but the quiz is active (e.g. between games)
    FinalRanking,
    Ended, // The quiz has ended
}

/**
 * Status of an individual game within the quiz.
 */
export enum GameStatus {
    NotStarted,
    InProgress,
    Completed,
}
