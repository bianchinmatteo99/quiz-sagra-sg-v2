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
    const preloadImagesUrls : string[] = [
        "/favicon/favicon.svg",
        "/img/waiting_for_start.png",
        "/img/qr-code.png",
        "/img/phone.png",
        "/img/icons8-gold-medal-100.png",
        "/img/icons8-silver-medal-100.png",
        "/img/icons8-bronze-medal-100.png",
        "/img/domino.jpg",
        "/img/song.jpg",
        "/img/guess_word.png",
        "/img/zip.png",
    ];
    const preloadImages = [];
    for (const url of preloadImagesUrls) {
        const img = new Image();
        img.src = url;
        preloadImages.push(img);
    }
});

