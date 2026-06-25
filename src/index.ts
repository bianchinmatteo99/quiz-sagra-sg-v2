import { FirebaseDatabaseAdapter } from "./common/database/firebase.adapter";
import { delay } from "./common/general.utils";
import { auth } from "./firebase-init";
import { Pager } from "./user/user.base.views";
import { RootPageChooser } from "./user/user.decisiontree";
import { StateHandler } from "./user/user.state";

document.addEventListener('DOMContentLoaded', async function () {
    const pageChooser = new RootPageChooser();
    const pager = new Pager();
    const state = new StateHandler(new FirebaseDatabaseAdapter(), auth);
    await state.setup();
    state.addObserver((s)=>pager.showPage(pageChooser.decide(state)));
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