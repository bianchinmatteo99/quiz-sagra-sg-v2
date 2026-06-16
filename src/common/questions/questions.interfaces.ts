import { IRenderable, RenderableUI } from "../navigator/renderable.interface";

export abstract class QuestionUser<S> implements IRenderable {
    abstract renderer: RenderableUI<S, any>;
    abstract onAnswer(answer: string): void;
    abstract onTimerEnd(): void;
}

export abstract class QuestionAdmin<S> implements IRenderable {
    abstract renderer: RenderableUI<S, any>;
    // abstract start(context: AdminContext): Promise<void>;
}