import { FirebaseDatabaseAdapter } from "./common/database/firebase.adapter";
import { auth } from "./firebase-init";
import { UserPager } from "./user/user.views";
import { UserRootPageChooser } from "./user/user.decisiontree";
import { UserStateHandler } from "./user/user.state";

document.addEventListener('DOMContentLoaded', async function () {
    const pageChooser = new UserRootPageChooser();
    const pager = new UserPager();
    const state = new UserStateHandler(new FirebaseDatabaseAdapter(), auth);
    await state.setup();
    state.addObserver((s)=>pager.showPage(pageChooser.decide(state)));
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