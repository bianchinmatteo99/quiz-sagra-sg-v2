import { CatenaGamePresenterStateView } from "./catena/catena.presenter.view";
import { CatenaGameDefinitionData, CatenaGameRequiredData } from "./catena/catena.contracts";
import { GamePresenterStateView } from "./games.presenter.base";
import { AnyGameDefinitionData } from "./games.contracts";
import { GuessSongGameRequiredData } from "./guess_song/guess_song.contracts"; // TESTING V2 - LINE WAS import { GuessSongGameDefinitionData, GuessSongGameRequiredData } from "./guess_song/guess_song.contracts";
import { GuessSongDefinitionData as GuessSongDefinitionDatav2, GuessSongGamePresenterStateView as GuessSongGamePresenterStateViewv2 } from "./tests.v2.guess_song"; // TESTING V2 - LINE WAS import { GuessSongGamePresenterStateView } from "./guess_song/guess_song.presenter.view";
import { OpenQuestionGameDefinitionData, OpenQuestionGameRequiredData } from "./open_question/open_question.contracts";
import { OpenQuestionGamePresenterStateView } from "./open_question/open_question.presenter.view";
import { GuessWordGameDefinitionData, GuessWordGameRequiredData } from "./guess_word/guess_word.contract";
import { GuessWordGamePresenterStateView } from "./guess_word/guess_word.presenter.view";
import { NumericEstimationGameDefinitionData, NumericEstimationGameRequiredData } from "./numeric_estimation/numeric_estimation.contracts";
import { NumericEstimationGamePresenterStateView } from "./numeric_estimation/numeric_estimation.presenter.view";
import { QDCPGameDefinitionData, QDCPGameRequiredData } from "./qdcp/qdcp.contracts";
import { QDCPGamePresenterStateView } from "./qdcp/qdcp.presenter.view";
import { ZipGameDefinitionData, ZipGameRequiredData } from "./zip/zip.contracts";
import { ZipGamePresenterStateView } from "./zip/zip.presenter.view";

export function instantiatePresenterStateViewForGame(definition: AnyGameDefinitionData): GamePresenterStateView {
    switch (definition.kind) {
        case CatenaGameRequiredData.kind:
            return new CatenaGamePresenterStateView(definition as CatenaGameDefinitionData);
        case GuessSongGameRequiredData.kind:
            return new GuessSongGamePresenterStateViewv2(definition as GuessSongDefinitionDatav2) as unknown as GamePresenterStateView; // TESTING V2 - LINE WAS             return new GuessSongGamePresenterStateView(definition as GuessSongGameDefinitionData);
        case OpenQuestionGameRequiredData.kind:
            return new OpenQuestionGamePresenterStateView(definition as OpenQuestionGameDefinitionData);
        case GuessWordGameRequiredData.kind:
            return new GuessWordGamePresenterStateView(definition as GuessWordGameDefinitionData);
        case NumericEstimationGameRequiredData.kind:
            return new NumericEstimationGamePresenterStateView(definition as NumericEstimationGameDefinitionData);
        case QDCPGameRequiredData.kind:
            return new QDCPGamePresenterStateView(definition as QDCPGameDefinitionData);
        case ZipGameRequiredData.kind:
            return new ZipGamePresenterStateView(definition as ZipGameDefinitionData);
        default:
            throw new Error("Presenter state view for game " + definition.kind + " not registered.");
    }
}