import { app, auth, database } from "./firebase-init";

document.addEventListener('DOMContentLoaded', function () {
    const loadEl = document.querySelector('#load');
    // firebase.auth().onAuthStateChanged(user => { });
    // firebase.database().ref('/path/to/ref').on('value', snapshot => { });

    try {
        let features = [
            'auth',
            'database',
        ].filter(feature => typeof (app as any)[feature] === 'function');

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
