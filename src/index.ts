import { FirebaseDatabaseAdapter } from "./common/database/firebase.adapter";
import { auth } from "./firebase-init";
import { UserPager } from "./user/user.views";
import { UserRootPageChooser } from "./user/user.decisiontree";
import { UserStateHandler } from "./user/user.state";

/**
 * Initialize the user-facing quiz application once the DOM is loaded.
 *
 * The app creates a user state handler backed by Firebase, a page chooser
 * that selects the current UI page based on state, and a pager that renders
 * the selected page into the document.
 */
document.addEventListener('DOMContentLoaded', async function () {
    const pageChooser = new UserRootPageChooser();
    const pager = new UserPager();
    const state = new UserStateHandler(new FirebaseDatabaseAdapter(), auth);

    // Initialize realtime state listeners and wait for auth readiness.
    await state.setup();

    // Refresh the visible page whenever state changes.
    state.addObserver((s)=>pager.showPage(pageChooser.decide(state)));

    // Update the footer team name and score on each state change.
    state.addObserver((s)=>pager.updateFooter(s.person?.name || "???", s.person?.rank?.points ?? 0));

    // PRELOAD IMAGES
    const preloadImagesUrls = ["/img/correct.gif", "/img/good-luck.gif", "/img/wrong.gif"];
    const preloadImages = [];
    for (const url of preloadImagesUrls) {
        const img = new Image();
        img.src = url;
        preloadImages.push(img);
    }

    // FOOTER UPDATE
    const score = document.getElementById("team-score")!;
    score.addEventListener("animationend", () => {
        score.classList.remove("animate");
    });
});

/**
 * Keep viewport CSS variables in sync with the current visual viewport size.
 *
 * This avoids layout issues on mobile devices when the onscreen keyboard
 * changes the visible viewport dimensions.
 */
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