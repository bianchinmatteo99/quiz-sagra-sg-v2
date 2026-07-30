import { Page, StaticPage } from "../../navigation/pages";
import { CatenaPage } from "../catena/catena.display.view";
import { GamePageChooser } from "../games.display.base";
import { CatenaGameStateSnapshot as ZipGameStateSnapshot, ZipState } from "./zip.contracts";

/**
 * Display-side page chooser for Zip snapshots.
 *
 * Reuses the Catena animated words page and feeds it `displayWords`, while
 * exposing a Zip-specific cover page for initial states.
 */
export class ZipGamePageChooser extends GamePageChooser<ZipGameStateSnapshot> {
    /** Reused words page to preserve diff-based animations between updates. */
    zipWords = new CatenaPage();

    decide(state: ZipGameStateSnapshot): Page {
        if (state.state === ZipState.STARTING || state.state === ZipState.DISPLAYCOVER) {
            return new ZipCoverPage(state.title);
        }

        this.zipWords.update(state.displayWords);
        return this.zipWords;
    }
}

/**
 * Static Zip cover shown before words progression starts.
 */
class ZipCoverPage extends StaticPage {
    templateColumnWidth = "1fr";
    private readonly title: string;

    constructor(title: string) {
        super();
        this.title = title;
    }

    render(): void {
        if (!this.container) throw new Error("Render called before create");
        this.container.innerHTML = `
            <h2>${this.title.toUpperCase()}</h2>
            <img src="/img/zip.png" style="height:50%;"/>
        `;
        Object.assign(this.container.style, {
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexDirection: "column",
        });
    }
}
