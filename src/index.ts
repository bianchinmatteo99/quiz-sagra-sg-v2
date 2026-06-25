import { FirebaseDatabaseAdapter } from "./common/database/firebase.adapter";
import { auth } from "./firebase-init";
import { StateHandler } from "./user/user.state";

document.addEventListener('DOMContentLoaded', function () {
    const state = new StateHandler(new FirebaseDatabaseAdapter(), auth);
    state.setup();
    const button = document.getElementById("test") as HTMLButtonElement;
    const input = document.getElementById("testinp") as HTMLInputElement;
    input.value = state.getName() ?? "";
    button.addEventListener("click", ()=>{
        state.registerWithName(input.value);
    })
    console.log(state);
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