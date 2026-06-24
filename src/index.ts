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



/*  VISIBLE VIEWPORT SETTINGS  */
function updateViewportSize() {
  const vv = window.visualViewport;

  const width = vv ? vv.width : window.innerWidth;
  const height = vv ? vv.height : window.innerHeight;

  document.documentElement.style.setProperty('--vw', `${width}px`);
  document.documentElement.style.setProperty('--vh', `${height}px`);
}

updateViewportSize();

window.addEventListener('resize', updateViewportSize);
window.visualViewport?.addEventListener('resize', updateViewportSize);
window.visualViewport?.addEventListener('scroll', updateViewportSize);
window.addEventListener('orientationchange', updateViewportSize);