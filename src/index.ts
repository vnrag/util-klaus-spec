import Mustache from 'mustache';

export interface KlausRoot {
  moduleId: string
  title: string
  minScore: number
  estimatedTime: number
  allowedAttempts: number
  format?: string
  steps: KlausStep[]
}

export interface KlausStep {
  id: string
  type: string
  title: string
  content: string
  theme?: string
  questions?: KlausQuestion[]
}

export interface KlausQuestion {
  type: string
  id: string
  content: string
  solution: string
  options: KlausQuestionOption[]
}

export interface KlausQuestionOption {
  id: string
  label: string
}

export enum Type {
  Text = 'text',
  Image = 'image',
  Quiz = 'quiz',
  Youtube = 'youtube',
  Radio = 'radio',
  Checkbox = 'checkbox'
}

export enum Format {
  SixteenToNine = '16_9',
  FourToThree = '4_3'
}

export const YOUTUBE_REGEX = /^.*(?:(?:youtu.be\/)|(?:v\/)|(?:\/u\/\w\/)|(?:embed\/)|(?:watch\?))\??v?=?([\w-]{11}).*/;

function unescape(string: string) {
  return string.trim()
    .replace( /&quot;/g, '"' )
    .replace( /&#39;/g, '\'' )
    .replace( /&lt;/g, '<' )
    .replace( /&gt;/g, '>' )
    .replace( /&amp;/g, '&' );
}

export class ModelQuestionOption {
  id: string
  label: string

  constructor(json: KlausQuestionOption) {
    this.id = json.id;
    this.label = json.label;
  }

  get value(): string {
    return this.id
  }

  static default(): ModelQuestionOption {
    return new ModelQuestionOption({
      id: Math.random().toString(36).substring(7),
      label: ''
    })
  }
}

export class ModelQuestion {
  readonly type: string
  readonly id: string
  readonly content: string
  readonly solution: string
  readonly options: ModelQuestionOption[]

  constructor(json: KlausQuestion) {
    this.type = json.type;
    this.id = json.id;
    this.content = json.content;
    this.solution = json.solution;
    this.options = json.options ? json.options.map(option => new ModelQuestionOption(option)) : [];
  }

  static default(): ModelQuestion {
    return new ModelQuestion({
      id: Math.random().toString(36).substring(7),
      type: Type.Radio,
      content: '',
      solution: '',
      options: [ModelQuestionOption.default()]
    })
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
}

export class ModelStep {
  private _index!: number
  readonly id: string
  readonly type: string
  readonly title: string
  readonly content: string
  locked: boolean
  navigate: boolean
  readonly theme: string

  constructor(json: KlausStep) {
    this.id = json.id;
    this.type = json.type;
    this.title = json.title;
    this.content = json.content;
    this.locked = false;
    this.navigate = true;
    this.theme = json.theme || 'light';
  }

  public get index(): number {
    return this._index;
  }

  public set index(index: number) {
    if (typeof this.index === 'undefined') {
      this._index = index
    }
  }

  static default(): ModelStep {
    return new ModelStep({
      id: Math.random().toString(36).substring(7),
      type: Type.Text,
      title: '',
      content: ''
    })
  }

  static fromJSON(json: KlausStep): ModelStep {
    switch (json.type) {
      case 'quiz':
        return new ModelStepQuiz(json);
      case 'image':
        return new ModelStepImage(json);
      case 'youtube':
        return new ModelStepYoutube(json);
      // case 'audio':
      //   return new ModelStepAudio(json);
      case 'text':
      case 'hero':
        return new ModelStepText(json);
      default:
        return new ModelStep(json);
    }
  }
}

export class ModelStepQuiz extends ModelStep {
  readonly questions: ModelQuestion[]

  constructor(json: KlausStep) {
    super(json);

    this.locked = true;
    this.questions = json.questions ? json.questions.map(question => new ModelQuestion(question)) : [ModelQuestion.default()];
  }

  getQuestionsAsCollection(): {[index: string]: ModelQuestion} {
    return this.questions.reduce((obj: {[index: string]: ModelQuestion}, question) => {
      obj[question.id] = question;

      return obj;
    }, {});
  }
}

export class ModelStepImage extends ModelStep {
  get url(): string {
    const url = new URL(this.content)
    return url.href
  }
}

export class ModelStepYoutube extends ModelStep {
  get url(): string {
    const url = new URL(this.content)
    return url.href
  }

  get iframeUrl(): string {
    // https://www.youtube.com/embed/SKUZYdnDJBI
    // https://youtu.be/SKUZYdnDJBI
    // https://www.youtube.com/watch?v=SKUZYdnDJBI

    const match = this.url.match(YOUTUBE_REGEX);
    if (!match) throw Error('Could not detect Youtube Video-ID')
    const url = `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&amp;showinfo=0`;

    return url;
  }
}

// Type Audio is not integrated at this time
export class ModelStepAudio extends ModelStep {
  get url(): string {
    const url = new URL(this.content)
    return url.href
  }
}

export class ModelStepText extends ModelStep {
  getCompiledContent(params: object = {}): string {
    return Mustache.render(unescape(this.content), params);
  }
}

export class Model {
  moduleId: string
  readonly title: string
  readonly minScore: number
  readonly estimatedTime: number
  readonly allowedAttempts: number
  readonly format: string
  readonly steps: ModelStep[]

  constructor(json: KlausRoot) {
    this.moduleId = json.moduleId;
    this.title = json.title;
    this.minScore = Number(json.minScore);
    this.estimatedTime = Number(json.estimatedTime);
    this.allowedAttempts = Number(json.allowedAttempts);
    this.format = json.format || Format.SixteenToNine;
    this.steps = json.steps ? json.steps.map((step, i) => {
      const newStep = ModelStep.fromJSON(step)
      newStep.index = i
      return newStep
    }) : []
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

  getQuestions(): object {
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
    return new Model({
      title: '',
      moduleId: Math.random().toString(36).substring(7),
      estimatedTime: 30,
      minScore: 60,
      allowedAttempts: 3,
      format: Format.SixteenToNine,
      steps: [ModelStep.default()]
    })
  }

  static fromJSON(json: KlausRoot): Model {
    return new Model(json);
  }
}
