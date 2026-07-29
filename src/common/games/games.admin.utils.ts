import { QuestionAnswers, QuestionResult } from "../questions/question.contract";
import { Ender } from "../questions/questions.admin.base";
import { RaiseHandQuestion } from "../questions/raise_hand/raise_hand.question.admin";
import { GameManager } from "./games.admin.base";


export async function startRepeatedRaiseHandFlow(context: GameManager,limitTrials: number|null, enderPerTurn?:Ender): Promise<{result: QuestionResult, trials: Map<string, number>}>{
    limitTrials = limitTrials ?? Number.MAX_SAFE_INTEGER;
    let ender = enderPerTurn ?? {}
    ender = {...ender, manual: true}
    
    const trials = new Map<string, number>()
    const cumulatedResults = new Map<string, boolean>() as QuestionResult
    const denied = [] as string[]

    while(true){
        const Q = new RaiseHandQuestion(context, ender, denied)
        const res = await Q.ask({beforeShowResults: async () => false})

        let correct = false;
        for(const [id, r] of res){
            cumulatedResults.set(id, r);
            if(r){
                correct = true;
            } else {
                const tried = (trials.get(id) ?? 0) + 1;
                trials.set(id, tried);
                if(tried >= limitTrials && !denied.includes(id)){
                    denied.push(id);
                }
            }
        }

        Q.clear();

        if(correct || ! await context.controller.adminInteraction({advanceBtn: "Riavvia domanda", otherBtn: "Concludi"})){
            break;
        }

    }

    return {result: cumulatedResults, trials};
}

export function numberOfSubmittedAnswersIs(n: number): ((a: QuestionAnswers) => boolean) {
    return (a) => {
        return a.size >= n;
    };
}
