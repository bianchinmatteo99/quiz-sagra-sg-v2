import { app, auth, database } from "./firebase-init";

document.addEventListener('DOMContentLoaded', function () {
    const loadEl = document.querySelector('#load');
    // firebase.auth().onAuthStateChanged(user => { });
    // firebase.database().ref('/path/to/ref').on('value', snapshot => { });

    try {
        let features: string[] = [];
        if (auth) features.push('auth');
        if (database) features.push('database');

        if (loadEl) {
            loadEl.textContent = `Firebase SDK loaded with ${features.join(', ')}`;
        }
    } catch (e) {
        console.error(e);
        if (loadEl) {
            loadEl.textContent = 'Error loading the Firebase SDK, check the console.';
        }
    }
});
