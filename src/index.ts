import Mustache from 'mustache';
import he from 'he';
import semver from 'semver';
import { Assets, Asset, KlausAsset, AssetType } from './assets'
export { Assets, Asset, AssetType }

export const VERSION = '1.2';

export const Snippets = {
  '{{ date }}': 'Aktuelles Datum und Uhrzeit',
  '{{ title }}': 'Titel des Elearning Moduls',
  '{{ userId }}': 'User-ID',
  '{{ score }}': 'Erreichter Score',
  '{{ minScore }}': 'Mindest-Score',
  '{{#success}} {{/success}}': 'Zeigen wenn geschafft',
  '{{#failed}} {{/failed}}': 'Zeigen wenn nicht geschafft',
  '{{{ results }}}': 'Ergebnisse'
}

export interface KlausRoot {
  moduleId: string
  version: string
  title: string
  minScore: number
  estimatedTime: number
  allowedAttempts: number
  format?: Format
  steps: KlausStep[]
  assets?: KlausAsset[]
}

export interface KlausStep {
  id: string
  type: Type
  title: string
  content: string
  theme?: Theme
  questions?: KlausQuestion[]
}

export interface KlausQuestion {
  type: Type
  id: string
  content: string
  solution: string
  options: KlausQuestionOption[]
}

export interface KlausQuestionOption {
  value: string
  label: string
}

export interface MustacheParams {
  minScore?: number,
  estimatedTime?: number,
  score?: number,
  userId?: string,
  date?: string,
  title?: string,
  success?: boolean,
  failed?: boolean,
  results?: string
}

export enum Type {
  Text = 'text',
  Hero = 'hero',
  Image = 'image',
  Quiz = 'quiz',
  Youtube = 'youtube',
  Vimeo = 'vimeo',
  Radio = 'radio',
  Checkbox = 'checkbox'
}

export enum Format {
  SixteenToNine = '16_9',
  FourToThree = '4_3'
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Primary = 'primary',
  Secondary = 'secondary'
}

// https://www.youtube.com/embed/SKUZYdnDJBI
// https://youtu.be/SKUZYdnDJBI
// https://www.youtube.com/watch?v=SKUZYdnDJBI
export const YOUTUBE_REGEX = /^.*(?:(?:youtu.be\/)|(?:v\/)|(?:\/u\/\w\/)|(?:embed\/)|(?:watch\?))\??v?=?([\w-]{11}).*/;

// https://vimeo.com/435640584
export const VIMEO_REGEX = /^.*(?:vimeo.com)\/(?:channels\/|channels\/\w+\/|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+)(?:$|\/|\?)/;

function unescape(string: string) {
  return string.trim()
    .replace( /&quot;/g, '"' )
    .replace( /&#39;/g, '\'' )
    .replace( /&lt;/g, '<' )
    .replace( /&gt;/g, '>' )
    .replace( /&amp;/g, '&' );
}

function getRandomString(length: number = 7): string {
  return [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
}

export class ModelQuestionOption {
  value: string
  label: string

  constructor(json: KlausQuestionOption) {
    this.value = json.value;
    this.label = json.label;
  }

  get id(): string {
    return this.value
  }

  getDecodedLabel(): string {
    return he.decode(this.label)
  }

  static default(): ModelQuestionOption {
    return new ModelQuestionOption({
      value: getRandomString(),
      label: ''
    })
  }
}

export class ModelQuestion {
  private _quiz!: ModelStepQuiz
  readonly type: Type
  readonly id: string
  readonly content: string
  readonly solution: string
  readonly options: ModelQuestionOption[]

  constructor(json: KlausQuestion, quiz: ModelStepQuiz) {
    Object.defineProperty(this, '_quiz', {
      value: quiz,
      enumerable: false
    })
    this.type = json.type;
    this.id = json.id;
    this.content = json.content;
    this.solution = json.solution;
    this.options = json.options ? json.options.map(option => new ModelQuestionOption(option)) : [];
  }

  get index(): number {
    return this._quiz.questions.findIndex(step => step.id === this.id);
  }

  getDecodedContent(): string {
    return he.decode(this.content)
  }

  getSolutionAsArray(): string[] {
    return this.solution.split(',').map(subStr => subStr.trim()).filter(Boolean).map(str => str.toLowerCase());
  }

  getScore(answers: string[]): number {
    if (typeof answers === 'undefined') return 0;
    const solutions = this.getSolutionAsArray();
    const weight = Number(1 / solutions.length);

    const score = answers.reduce((subSum, answer) => {
      if (solutions.includes(answer)) return subSum + weight;
      return subSum - weight;
    }, 0);

    return score;
  }

  getIsCorrect(answers: string[]): boolean {
    return this.getScore(answers) === 1;
  }

  static default(quiz: ModelStepQuiz): ModelQuestion {
    return new ModelQuestion({
      id: getRandomString(),
      type: Type.Radio,
      content: '',
      solution: '',
      options: [ModelQuestionOption.default()]
    }, quiz)
  }

  static fromJSON(json: KlausQuestion, quiz: ModelStepQuiz): ModelQuestion {
    return new ModelQuestion(json, quiz);
  }
}

export class ModelStep {
  protected _model!: Model
  readonly id: string
  title: string
  content: string
  readonly type: Type
  locked!: boolean
  navigate!: boolean
  readonly theme: Theme

  constructor(json: KlausStep, model: Model) {
    Object.defineProperty(this, '_model', {
      value: model,
      enumerable: false
    })
    Object.defineProperty(this, 'locked', {
      value: false,
      enumerable: false,
      writable: true
    })
    Object.defineProperty(this, 'navigate', {
      value: true,
      enumerable: false,
      writable: true
    })

    this.id = json.id;
    this.type = json.type;
    this.title = json.title;
    this.content = json.content;
    this.theme = json.theme || Theme.Light;
  }

  get index(): number {
    return this._model.steps.findIndex(step => step.id === this.id);
  }

  getDecodedTitle(): string {
    return he.decode(this.title)
  }

  getDecodedContent(): string {
    return he.decode(this.content)
  }

  static default(model: Model): ModelStep {
    return new ModelStep({
      id: getRandomString(),
      type: Type.Text,
      title: '',
      content: ''
    }, model)
  }

  static fromJSON(json: KlausStep, model: Model): ModelStep {
    switch (json.type) {
      case Type.Quiz:
        return new ModelStepQuiz(json, model);
      case Type.Image:
        return new ModelStepImage(json, model);
      case Type.Youtube:
        return new ModelStepYoutube(json, model);
      case Type.Vimeo:
        return new ModelStepVimeo(json, model);
      case Type.Text:
      case Type.Hero:
        return new ModelStepText(json, model);
      default:
        return new ModelStep(json, model);
    }
  }
}

export class ModelStepQuiz extends ModelStep {
  readonly questions: ModelQuestion[]

  constructor(json: KlausStep, model: Model) {
    super(json, model);

    this.locked = true;
    this.questions = json.questions ? json.questions.map((question, i) => ModelQuestion.fromJSON(question, this)) : [ModelQuestion.default(this)]
  }

  getQuestionsAsCollection(): {[index: string]: ModelQuestion} {
    return this.questions.reduce((obj: {[index: string]: ModelQuestion}, question) => {
      obj[question.id] = question;

      return obj;
    }, {});
  }

  getQuestionById(id: string): ModelQuestion {
    return this.questions.filter(question => question.id === id)[0];
  }
}

export class ModelStepImage extends ModelStep {
  constructor(json: KlausStep, model: Model) {
    super(json, model);

    // Upgrade to Asset Manager model
    if (!semver.satisfies(<semver.SemVer>semver.coerce(this._model.version), '>=1.2.0')) {
      const asset = this._model.assets.addFromUrl(this.content);
      this.content = asset.id;
    }
  }
  get url(): string {
    const asset = this._model.assets.getAssetById(this.content);

    if (asset instanceof Asset) return asset.url
    return ''
  }
}

export class ModelStepYoutube extends ModelStep {
  get url(): string {
    return this.content;
    // return this._model.assets.getAssetById(this.content).url
  }

  get iframeUrl(): string {
    const match = this.url.match(YOUTUBE_REGEX);
    if (!match) throw Error('Could not detect Youtube Video-ID')
    const url = `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&amp;showinfo=0`;

    return url;
  }
}

export class ModelStepVimeo extends ModelStep {
  get url(): string {
    return this.content;
    // return this._model.assets.getAssetById(this.content).url
  }

  get iframeUrl(): string {
    const match = this.url.match(VIMEO_REGEX);
    if (!match) throw Error('Could not detect Vimeo Video-ID')
    const url = `https://player.vimeo.com/video/${match[1]}?color=ffffff&title=0&byline=0&portrait=0`;

    return url;
  }
}

export class ModelStepText extends ModelStep {
  constructor(json: KlausStep, model: Model) {
    super(json, model);
  }

  getCompiledContent(params: MustacheParams = {}): string {
    return Mustache.render(this.getDecodedContent(), params);
  }
}

export class Model {
  moduleId: string
  version: string
  readonly title: string
  readonly minScore: number
  readonly estimatedTime: number
  readonly allowedAttempts: number
  readonly format: Format
  readonly steps: ModelStep[]
  readonly assets: Assets

  constructor(json: KlausRoot) {
    this.version = json.version;
    this.moduleId = json.moduleId;
    this.title = json.title;
    this.minScore = Number(json.minScore);
    this.estimatedTime = Number(json.estimatedTime);
    this.allowedAttempts = Number(json.allowedAttempts);
    this.format = json.format || Format.SixteenToNine;
    this.assets = Assets.fromArray(json.assets);
    this.steps = json.steps ? json.steps.map((step, i) => ModelStep.fromJSON(step, this)) : [ModelStep.default(this)];
  }

  stringify(): string {
    return JSON.stringify(this);
  }

  getDecodedTitle(): string {
    return he.decode(this.title)
  }

  getStepSize(): number {
    return this.steps.length;
  }

  getStepById(id: string): ModelStep {
    return this.steps.filter(step => step.id === id)[0];
  }

  getQuiz(): ModelStepQuiz {
    return this.getQuizzes()[0];
  }

  getQuizzes(): ModelStepQuiz[] {
    return <ModelStepQuiz[]>this.steps.filter(step => step instanceof ModelStepQuiz);
  }

  hasQuiz(): boolean {
    return this.steps.some(step => step instanceof ModelStepQuiz);
  }

  getQuestions(): {[index: string]: ModelQuestion} {
    return this.getQuizzes().reduce((obj, quiz) => Object.assign({}, obj, quiz.getQuestionsAsCollection()), {});
  }

  getLimitedSteps(currentIndex: number, range: number = 5): (ModelStep | string)[] {
    const length = this.steps.length;
    const start = Math.round(Math.max(Math.min(currentIndex - (range / 2), length - range), 0));
    const end = Math.round(Math.min(Math.max(currentIndex + (range / 2), range), length));

    let newArray: (ModelStep | string)[] = this.steps.slice(start, end);
    if (start > 1) newArray = ['…', ...newArray];
    if (start > 0) newArray = [this.steps[0], ...newArray];
    if (end < (length - 1)) newArray = [...newArray, '…'];
    if (end < (length)) newArray = [...newArray, this.steps[length - 1]];

    return newArray;
  }

  static default(): Model {
    const newModel = new Model({
      version: VERSION,
      title: '',
      moduleId: getRandomString(),
      estimatedTime: 30,
      minScore: 60,
      allowedAttempts: 3,
      format: Format.SixteenToNine,
      steps: []
    })

    newModel.steps.push(ModelStep.default(newModel))

    return newModel
  }

  static fromJSON(json: KlausRoot): Model {
    const model = new Model(json)
    return model;
  }
}
