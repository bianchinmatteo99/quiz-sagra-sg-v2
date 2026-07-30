
import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";


export enum ZipState {
    
    STARTING,
    
    DISPLAYCOVER,
    
    ASKINGQUESTION,
    
    ENDING,
}

export const ZipGameRequiredData = {kind: "zip", name: "Zip"} as const satisfies GameRequiredData


export interface ZipGameDefinitionData extends GameDefinitionData<typeof ZipGameRequiredData> {
    
    timeForAnswer: number;
    
    canRetryForSameZip: boolean;
    
    zips: string[][];
    
    pointsForCorrectAnswer: number;
}

export interface CatenaGameStateSnapshot extends GameStateSnapshotBase<typeof ZipGameRequiredData> {
    
    state: ZipState;
    
    currentZip: number;
    
    currentZipLetters: number;
    
    timeForAnswer: number;
    
    canRetryForSameZip: boolean;
    
    pointsForCorrectAnswer: number;
    
    displayWords: string[];
}

