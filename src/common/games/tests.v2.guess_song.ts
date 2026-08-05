import {
    customDbKey,
    defineFields,
    definition,
    GameDefinition,
    GameDefinitionBuilder,
    GameDbDataFromFields,
    GameAdditionalDefinitionDataFromFields,
    GameModelDataFromFields,
    model,
    Parsers,
    required,
    ValidationError,
    GameNoncustomDbDataFromFields,
    GameModel,
    GameModelContext,
    GameRequiredDataFromFields,
    GameDefinitionDataFromFields,
    GameViewContext,
    GameView,
    GameController,
    GameControllerContext,
    GamePresenterStateView,
    GameManager,
    GameManagerContext,
} from "./tests.v2.base";
import { Secret } from "../general.utils";
import { startRepeatedRaiseHandFlow } from "./games.admin.utils";
import { ResumeCheckpoints } from "../admin.utils";
import { StopWhenBuildersCollection } from "../questions/questions.admin.base";

export enum GuessSongState {
    /** Game has been started but no content is visible to participants yet. */
    STARTING,
    /** The song cover (or any visual hint) is being shown. */
    DISPLAYCOVER,
    /** Participants can submit their answer for the current song. */
    ASKINGQUESTION,
    /** The correct answer is revealed to all clients. */
    SHOWINGANSWER,
    /** Game is wrapping up; results are finalised. */
    ENDING,
}

export const guessSongFields = defineFields({
    ...required("guess_song", "Indovina la canzone"),

    limitTrialsPerSong: definition({
        visibility: "public",
        mdkey: "limit_trials_per_song",
        parser: Parsers.number,
        default: Number.MAX_SAFE_INTEGER,
        validator: (unsafe) => unsafe > 0 ? null : new ValidationError("limit_trials_per_song must be > 0"),
        views: {showin: "both", descr: "Numero di tentativi per ogni canzone", translate: (v)=>v===Number.MAX_SAFE_INTEGER?"infiniti":String(v)}
    }),

    stopWhenFirstHandIsRaised: definition({
        visibility: "public",
        mdkey: "stop_when_first_hand_raised",
        parser: Parsers.boolean,
        default: false,
        views: {showin: "both", descr: "Blocca le risposte", translate: (v)=>v?"alla prima prenotazione":"manuale"}
    }),

    correctAnswers: definition({
        visibility: "private",
        mdkey: "correct_answers",
        parser: Parsers.getListParserFor(Parsers.string)
    }),

    pointsForCorrectAnswer: definition({
        visibility: "public",
        mdkey: "points_for_correct_answer",
        parser: Parsers.number,
        validator: (unsafe) => unsafe >= 0 ? null : new ValidationError("points_for_correct_answer must be >= 0"),
        views: {showin: "both", descr: "Punti per ogni risposta corretta"}
    }),

    state: model({
        visibility: "public",
        default: GuessSongState.STARTING
    }),

    currentSongIndex: model({
        visibility: "public",
        default: -1
    }),

    displayCorrectAnswer: model({
        visibility: "public",
        default: ""
    }),
} as const);

export type GuessSongDefinitionData = GameDefinitionDataFromFields<typeof guessSongFields>;
export type GuessSongModelData = GameModelDataFromFields<typeof guessSongFields>;
export type GuessSongDbData = GameDbDataFromFields<typeof guessSongFields>;


export class GuessSongGameDefinition extends GameDefinition<typeof guessSongFields> {}
export interface GuessSongGameDefinition extends GuessSongDefinitionData {}


export class GuessSongDefinitionBuilder extends GameDefinitionBuilder<typeof guessSongFields> {
    constructor(){
        super(guessSongFields);
    }
}

export class GuessSongGameModel extends GameModel<typeof guessSongFields> {
    constructor(ctx: GameModelContext, def: GuessSongGameDefinition){
        super(ctx, def, guessSongFields);
    }

    toJSON(): GuessSongDbData {
        return {
            ...this.parseFieldsToDbData()
        }
    }

    parseFromJSON(data: Partial<GuessSongDbData>): boolean {
        const parsed = this.parseFieldsFromDbData(data);
        Object.assign(this, parsed);
        return true;
    }

    getSong(i: number): string | null {
        if (i in this.correctAnswers) {
            return this.correctAnswers[i]!;
        }
        return null;
    }

    getSongAsSecret(i: number): Secret<string> | null {
        const song = this.getSong(i);
        if (!song) return null;
        return new Secret(song, () => "***");
    }

    getCurrentSong(): string | null {
        return this.getSong(this.currentSongIndex);
    }
}
export interface GuessSongGameModel extends GuessSongModelData {}



export interface GuessSongGameViewContext extends GameViewContext<typeof guessSongFields> {
    model: GuessSongGameModel;
}

/**
 * Guess Song-specific view implementation.
 */
export class GuessSongGameView extends GameView<typeof guessSongFields> {
    readonly fields = guessSongFields;
    activeGameContext: GuessSongGameViewContext | null;
    gameDef: GuessSongGameDefinition;

    constructor(ctx: GuessSongGameViewContext | null = null, gameDef: GuessSongGameDefinition | null = null) {
        super();
        this.activeGameContext = ctx;
        this.gameDef = this.readDefinition(ctx, gameDef);
    }

    getSteps(): (string | ((s: boolean) => string))[] {
        return [
            "Mostra titolo",
            ...this.gameDef.correctAnswers.map((song, index) => ((s: boolean) => `Canzone ${index + 1}: ${s ? song : "***"}`)),
            "Conclusione",
        ];
    }

    getCurrentStep(): number | null {
        if (!this.activeGameContext) return null;
        const stepCount = this.getSteps().length;
        switch (this.activeGameContext.model.state) {
            case GuessSongState.DISPLAYCOVER:
                if(this.activeGameContext.model.currentSongIndex<0){
                    return 0;
                }
            case GuessSongState.ASKINGQUESTION:
            case GuessSongState.SHOWINGANSWER:
                return 1 + this.activeGameContext.model.currentSongIndex;
            case GuessSongState.ENDING:
                return stepCount - 1;
            default:
                return 0;
        }
    }

    renderCurrentState(container: HTMLElement): void {
        if (!this.activeGameContext) return;
        const showSecrets = this.canDisplaySecrets();
        const displayedSong = this.activeGameContext.model.displayCorrectAnswer || (this.activeGameContext.model
            .getSongAsSecret(this.activeGameContext.model.currentSongIndex)
            ?.read(showSecrets) ?? "?");

        container.innerHTML = this.parseFieldsToAdminCurrentStateView() + `Risposta corretta: ${displayedSong}`;
    }
}

/**
 * Controller for the Guess Song game.
 */
export class GuessSongGameController extends GameController<typeof guessSongFields> implements GuessSongGameViewContext {
    model: GuessSongGameModel;
    view: GuessSongGameView;

    constructor(ctx: GameControllerContext, def: GuessSongGameDefinition) {
        super(ctx);
        this.model = new GuessSongGameModel(this, def);
        this.view = new GuessSongGameView(this);
    }

    nextSong() : boolean{
        const next = this.model.currentSongIndex+1;
        const nextw = this.model.getSong(next);
        if(!!nextw) {
            this.model.currentSongIndex = next;
            this.stateUpdated();
            return true;
        } else {
            return false;
        }
    }

    displayCorrectAnswer(b : boolean){
        this.model.displayCorrectAnswer = b ? this.model.getCurrentSong()??"" : ""
    }

    setState(s: GuessSongState): void {
        this.displayCorrectAnswer(s===GuessSongState.SHOWINGANSWER)
        this.model.state = s;
        this.stateUpdated();
    }
}

export class GuessSongGameManager extends GameManager {
    /** Controller owning Guess Song model state and admin-facing rendering. */
    controller: GuessSongGameController;

    /**
     * Create a Guess Song manager bound to host-level game context.
     *
     * @param ctx Manager context provided by the quiz runtime.
     * @param def Parsed Guess Song game definition for this session.
     * @param restoreState When true, controller/model attempt state restoration.
     */
    constructor(ctx: GameManagerContext, def: GuessSongGameDefinition, restoreState: boolean = false) {
        super(ctx, restoreState);
        this.controller = new GuessSongGameController(this, def);
    }

    /**
     * Execute the Guess Song game flow.
     */
    async startGame(): Promise<void> {
        await this.controller.model.restoreOrSave();

        if (this.resumeCheckpoints.reachedCheckPoint("start-phase")) {
            this.controller.setState(GuessSongState.DISPLAYCOVER);
        }

        while (this.controller.nextSong()) {
            if(! await this.controller.adminInteraction({advanceBtn: "Avvia la canzone", otherBtn: "Salta questa canzone"})){
                continue;
            }

            this.controller.setState(GuessSongState.ASKINGQUESTION);

            const ender = {manual: true, ...(this.controller.model.stopWhenFirstHandIsRaised ? {stopWhen: StopWhenBuildersCollection.NumberOfSubmittedAnswersIs(1)} : {})}
            const {result, trials} = await startRepeatedRaiseHandFlow(this, ender, {limitWrongTrials: this.controller.model.limitTrialsPerSong})
            
            await this.controller.adminInteraction({advanceBtn: "Mostra risposta"})
            this.controller.setState(GuessSongState.SHOWINGANSWER);

            this.context.updateRanking(new Map(result.entries().filter(([id, v]) => v).map(([id, v]) => [id, this.controller.model.pointsForCorrectAnswer])))

            await this.controller.adminInteraction({advanceBtn: "Continua"})
            this.controller.setState(GuessSongState.DISPLAYCOVER);
        }

        this.resumeCheckpoints.reachedCheckPoint("end-phase");
        this.controller.setState(GuessSongState.ENDING);
    }

    buildResumeCheckpoints(): ResumeCheckpoints {
        return new ResumeCheckpoints({
            "start-phase": (endResume) => {
                if (this.controller.model.state == GuessSongState.ENDING) {
                    return false;
                } else {
                    endResume();
                    return true;
                }
            },
            "end-phase": (endResume) => {
                endResume();
                return true;
            }
        });
    }
}



export class GuessSongGamePresenterStateView extends GamePresenterStateView<typeof guessSongFields> {
    readonly fields = guessSongFields;
    /**
     * Render the Guess Song presenter panel.
     *
     * @param container Target element to fully replace with rendered content.
     * @param gameState Runtime snapshot from `/state/game`.
     * @param showSecrets Whether unrevealed song content can be shown in clear text.
     */
    render(container: HTMLElement, gameState: Partial<GuessSongDbData> | null, showSecrets: boolean): void {
        const others = this.parseFieldsToPresenterCurrentStateView(gameState);

        const currentSongIndex = gameState?.currentSongIndex ?? 0;
        const currentSong = this.gameDefinition.correctAnswers[currentSongIndex] ?? null;
        const song = currentSong
            ? "TITOLO CANZONE: " + (showSecrets || gameState?.state===GuessSongState.SHOWINGANSWER ? currentSong.toUpperCase() : "***")
            : "Nessuna canzone corrente";

        container.innerHTML = others + song;
    }
}












