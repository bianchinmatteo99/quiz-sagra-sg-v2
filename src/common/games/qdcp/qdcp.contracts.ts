import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";


export enum QDCPState {
    
    STARTING,
    
    DISPLAYCOVER,
    
    ASKINGQUESTION,
    
    ENDING,
}


export const QDCPGameRequiredData = {kind: "qdcp", name: "Quando Dove Come Perché"} as const satisfies GameRequiredData


export interface QDCPGameDefinitionData extends GameDefinitionData<typeof QDCPGameRequiredData> {
    
    limitTrialsPerSection: number;
    
    stopWhenFirstHandRaised: boolean;
    
    hintsAndAnswers: string[][];
    
    pointsForCorrectAnswer: number;
}


export interface QDCPGameStateSnapshot extends GameStateSnapshotBase<typeof QDCPGameRequiredData> {
    
    state: QDCPState;
    
    currentIndex: number;

    currentSection: number;
    
    displayContents: string[];

    
    limitTrialsPerSection: number;
    
    stopWhenFirstHandIsRaised: boolean;
    
    pointsForCorrectAnswer: number;
}