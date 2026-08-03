import { QuestionAnswers, QuestionResult } from "../questions/question.contract";
import { Ender } from "../questions/questions.admin.base";
import { RaiseHandQuestion } from "../questions/raise_hand/raise_hand.question.admin";
import { GameManager } from "./games.admin.base";


export async function startRepeatedRaiseHandFlow(context: GameManager, enderPerTurn?:Ender, penalties?: PenaltyPolicy): Promise<{result: QuestionResult, trials: Record<string, number>}>{
    let ender = enderPerTurn ?? {}
    ender = {...ender, manual: true}
    
    const cumulatedResults = new Map<string, boolean>() as QuestionResult
    
    const penaltyHandler = new PenaltyHandler(penalties ?? {});

    let currentQ : RaiseHandQuestion | null = null;

    try{
        while(true){
            currentQ = new RaiseHandQuestion(context, ender, penaltyHandler.getCurrentDenyList())
            const res = await currentQ.ask({beforeShowResults: async () => false})

            penaltyHandler.updateWith(res);

            let correct = false;
            for(const [id, r] of res){
                cumulatedResults.set(id, r);
                correct = correct || r;
            }

            currentQ.clear();
            currentQ = null;

            if(correct || ! await context.controller.adminInteraction({advanceBtn: "Riavvia domanda", otherBtn: "Concludi"})){
                break;
            }

        }
    } finally {
        currentQ?.clear()
    }

    return {result: cumulatedResults, trials: penaltyHandler.getTotalTrialsUsed()};
}

export type PenaltyPolicy = {limitWrongTrials?: number, awaitTime?: number, awaitTurns?: number}

export class PenaltyHandler {
    private availableTrials : Record<string, number> = {}
    private totalTrialsUsed : Record<string, number> = {}
    private persistentDenyList : string[] = []
    private temporaryDenyList : Map<string, {runningTimeout?: number, blockTurns?: number}> = new Map()

    constructor(readonly policy: PenaltyPolicy){}

    updateWith(res : QuestionResult, considerAsNewTurn: boolean = true, trialsUsed?: Record<string, number>){
        if(considerAsNewTurn) this.updateTurns();
        res.entries().forEach(([id, correctAnswer])=>{
            if(this.persistentDenyList.includes(id) || this.temporaryDenyList.has(id)){
                console.warn("There was an unexpected answer: user with the following id was penalized but a new answer was received. ID: " + id);
                this.clearTemporaryUser(id);
            }
            this.totalTrialsUsed[id] = (this.totalTrialsUsed[id] ?? 0) + (trialsUsed?.[id] ?? 1);
            if(this.policy.limitWrongTrials){
                const was = this.availableTrials[id] ?? this.policy.limitWrongTrials;
                const wrongTrialsUsed = (trialsUsed?.[id] ?? 1) - (correctAnswer ? 1 : 0)
                const next = was-wrongTrialsUsed;
                this.availableTrials[id] = next;
                if(next<=0 && !this.persistentDenyList.includes(id)){
                    this.persistentDenyList.push(id);
                }
            }
            if(correctAnswer) return;
            if(this.policy.awaitTime || this.policy.awaitTurns){
                const future = {} as {runningTimeout?: number, blockTurns?: number}
                if(this.policy.awaitTime){
                    future.runningTimeout = setTimeout(()=>this.timeoutEnded(id), this.policy.awaitTime);
                }
                if(this.policy.awaitTurns){
                    future.blockTurns = this.policy.awaitTurns;
                }
                this.temporaryDenyList.set(id, future)
            }
        });
    }

    getCurrentDenyList(): string[]{
        return [...this.temporaryDenyList.keys(), ...this.persistentDenyList];
    }
    getCurrentAvailableTrials(): Record<string, number>{
        return {...this.availableTrials}
    }
    getTotalTrialsUsed(): Record<string, number>{
        return {...this.totalTrialsUsed}
    }

    updateTurns(){
        this.temporaryDenyList.entries().forEach(([id, {runningTimeout: runningInterval, blockTurns}]) => {
            if(blockTurns){
                blockTurns--
                if(blockTurns<=0){
                    if(runningInterval){
                        this.temporaryDenyList.set(id, {runningTimeout: runningInterval})
                    } else {
                        this.temporaryDenyList.delete(id)
                    }
                } else {
                    this.temporaryDenyList.set(id, {runningTimeout: runningInterval, blockTurns})
                }
            }
        })
    }
    private timeoutEnded(id:string){
        const now = this.temporaryDenyList.get(id);
        if(!now) return;
        if(now.blockTurns){
            this.temporaryDenyList.set(id, {blockTurns: now.blockTurns})
        } else {
            this.temporaryDenyList.delete(id)
        }
    }

    private clearTemporaryUser(id : string){
        if(this.temporaryDenyList.has(id)){
            clearTimeout(this.temporaryDenyList.get(id)?.runningTimeout)
            this.temporaryDenyList.delete(id)
        }
    }
    resetTemporary(){
        this.temporaryDenyList.keys().forEach(id=>this.clearTemporaryUser(id));
    }
    resetTrials(){
        this.persistentDenyList = []
        this.availableTrials = {}
        this.totalTrialsUsed = {}
    }
    resetAll(){
        this.resetTemporary()
        this.resetTrials()
    }
}