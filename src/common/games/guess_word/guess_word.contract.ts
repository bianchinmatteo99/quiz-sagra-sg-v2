import { GameDefinitionData, GameRequiredData, GameStateSnapshotBase } from "../games.contracts";


export enum GuessWordState {
    STARTING,
    
    DISPLAYCOVER,
    
    ASKINGQUESTION,
    
    ENDING,
}


export const GuessWordGameRequiredData = {kind: "guess_word", name: "Indovina la parola"} as const satisfies GameRequiredData


export interface GuessWordGameDefinitionData extends GameDefinitionData<typeof GuessWordGameRequiredData> {
    
    stopAtFirstCorrectAnswer: boolean;
    
    correctAnswers: string[];
    
    pointsForCorrectAnswer: number;

    delayBetweenLetterDisplay: number|false;

    sameLettersPolicy: "separate"|"together"|"default";

}

export interface GuessWordGameStateSnapshot extends GameStateSnapshotBase<typeof GuessWordGameRequiredData> {
    
    state: GuessWordState;
    
    currentWordIndex: number;
    
    displayWord: string;

    stopAtFirstCorrectAnswer: boolean;
    
    pointsForCorrectAnswer: number;

    delayBetweenLetterDisplay: number|false;

    sameLettersPolicy: "separate"|"together"|"default";

}