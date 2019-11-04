import { Assets, Asset, KlausAsset, AssetType } from './assets';
export { Assets, Asset, AssetType };
export declare const VERSION = "1.2";
export declare const Snippets: {
    '{{ date }}': string;
    '{{ title }}': string;
    '{{ userId }}': string;
    '{{ score }}': string;
    '{{ minScore }}': string;
    '{{#success}} {{/success}}': string;
    '{{#failed}} {{/failed}}': string;
    '{{{ results }}}': string;
};
export interface KlausRoot {
    moduleId: string;
    version: string;
    title: string;
    minScore: number;
    estimatedTime: number;
    allowedAttempts: number;
    format?: Format;
    steps: KlausStep[];
    assets?: KlausAsset[];
}
export interface KlausStep {
    id: string;
    type: Type;
    title: string;
    content: string;
    theme?: Theme;
    questions?: KlausQuestion[];
}
export interface KlausQuestion {
    type: Type;
    id: string;
    content: string;
    solution: string;
    options: KlausQuestionOption[];
}
export interface KlausQuestionOption {
    value: string;
    label: string;
}
export interface MustacheParams {
    minScore?: number;
    estimatedTime?: number;
    score?: number;
    userId?: string;
    date?: string;
    title?: string;
    success?: boolean;
    failed?: boolean;
    results?: string;
}
export declare enum Type {
    Text = "text",
    Hero = "hero",
    Image = "image",
    Quiz = "quiz",
    Youtube = "youtube",
    Vimeo = "vimeo",
    Radio = "radio",
    Checkbox = "checkbox"
}
export declare enum Format {
    SixteenToNine = "16_9",
    FourToThree = "4_3"
}
export declare enum Theme {
    Light = "light",
    Dark = "dark",
    Primary = "primary",
    Secondary = "secondary"
}
export declare const YOUTUBE_REGEX: RegExp;
export declare class ModelQuestionOption {
    value: string;
    label: string;
    constructor(json: KlausQuestionOption);
    readonly id: string;
    getDecodedLabel(): string;
    static default(): ModelQuestionOption;
}
export declare class ModelQuestion {
    private _quiz;
    readonly type: Type;
    readonly id: string;
    readonly content: string;
    readonly solution: string;
    readonly options: ModelQuestionOption[];
    constructor(json: KlausQuestion, quiz: ModelStepQuiz);
    readonly index: number;
    getDecodedContent(): string;
    getSolutionAsArray(): string[];
    getScore(answers: string[]): number;
    getIsCorrect(answers: string[]): boolean;
    static default(quiz: ModelStepQuiz): ModelQuestion;
    static fromJSON(json: KlausQuestion, quiz: ModelStepQuiz): ModelQuestion;
}
export declare class ModelStep {
    protected _model: Model;
    readonly id: string;
    title: string;
    content: string;
    readonly type: Type;
    locked: boolean;
    navigate: boolean;
    readonly theme: Theme;
    constructor(json: KlausStep, model: Model);
    readonly index: number;
    getDecodedTitle(): string;
    getDecodedContent(): string;
    static default(model: Model): ModelStep;
    static fromJSON(json: KlausStep, model: Model): ModelStep;
}
export declare class ModelStepQuiz extends ModelStep {
    readonly questions: ModelQuestion[];
    constructor(json: KlausStep, model: Model);
    getQuestionsAsCollection(): {
        [index: string]: ModelQuestion;
    };
    getQuestionById(id: string): ModelQuestion;
}
export declare class ModelStepImage extends ModelStep {
    constructor(json: KlausStep, model: Model);
    readonly url: string;
}
export declare class ModelStepYoutube extends ModelStep {
    readonly url: string;
    readonly iframeUrl: string;
}
export declare class ModelStepText extends ModelStep {
    constructor(json: KlausStep, model: Model);
    getCompiledContent(params?: MustacheParams): string;
}
export declare class Model {
    moduleId: string;
    version: string;
    readonly title: string;
    readonly minScore: number;
    readonly estimatedTime: number;
    readonly allowedAttempts: number;
    readonly format: Format;
    readonly steps: ModelStep[];
    readonly assets: Assets;
    constructor(json: KlausRoot);
    stringify(): string;
    getDecodedTitle(): string;
    getStepSize(): number;
    getStepById(id: string): ModelStep;
    getQuiz(): ModelStepQuiz;
    getQuizzes(): ModelStepQuiz[];
    hasQuiz(): boolean;
    getQuestions(): {
        [index: string]: ModelQuestion;
    };
    getLimitedSteps(currentIndex: number, range?: number): (ModelStep | string)[];
    static default(): Model;
    static fromJSON(json: KlausRoot): Model;
}
