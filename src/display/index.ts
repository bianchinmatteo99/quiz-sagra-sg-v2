import { FirebaseDatabaseAdapter } from "../common/database/firebase.adapter";
import { DisplayPager } from "./display.views";
import { DisplayRootPageChooser } from "./display.decisiontree";
import { DisplayStateHandler } from "./display.state";

/**
 * Bootstraps the display screen once the document is ready.
 */
document.addEventListener('DOMContentLoaded', async function () {
    const pageChooser = new DisplayRootPageChooser();
    const pager = new DisplayPager();
    const state = new DisplayStateHandler(new FirebaseDatabaseAdapter());
    await state.setup();
    state.addObserver((s)=>pager.showPage(pageChooser.decide(state)));

    // PRELOAD IMAGES
    const preloadImagesUrls : string[] = [];
    const preloadImages = [];
    for (const url of preloadImagesUrls) {
        const img = new Image();
        img.src = url;
        preloadImages.push(img);
    }
});

