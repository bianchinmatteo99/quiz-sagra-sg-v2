import { auth } from "../firebase-init";
import { signInWithEmailAndPassword } from "firebase/auth";

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;

            errorMessage.textContent = 'Logging in...';

            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Logged in successfully. check-auth.js will handle redirect to /
                    errorMessage.textContent = 'Success! Redirecting...';
                    errorMessage.style.color = 'green';
                })
                .catch((error) => {
                    const errorCode = error.code;
                    const errorMsg = error.message;
                    errorMessage.textContent = `${errorCode}: ${errorMsg}`;
                    errorMessage.style.color = 'red';
                });
        });
    }
});
