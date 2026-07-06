/**
 * Admin page entry point.
 *
 * This module initializes the quiz management flow for the admin interface.
 * It waits until the browser has loaded the DOM, creates a quiz manager using
 * the Firebase database adapter, loads the quiz definition, and then starts
 * the quiz manager.
 */
import { FirebaseDatabaseAdapter } from "../common/database/firebase.adapter";
import { QuizManager } from "../common/quiz/quiz.manager";


document.addEventListener('DOMContentLoaded', async function () {
    // Create the quiz manager and bind it to the Firebase-backed database.
    const quizManager = new QuizManager(new FirebaseDatabaseAdapter());

    // Load the quiz definition file so the manager can build questions and game state.
    await quizManager.boot("/quiz_def.md");

    // Start the admin quiz flow, making the quiz manager active and ready to render.
    await quizManager.start();
});
