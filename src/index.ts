import Mustache from 'mustache';

export interface KlausRoot {
  title: string
  minScore: number
  estimatedTime: number
  allowedAttempts: number
  format: string
  steps: KlausStep[]
}

export interface KlausStep {
  model: KlausRoot
  id: string
  type: string
  title: string
  content: string
  locked: boolean
  navigate: boolean
  theme: string
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

const YOUTUBE_REGEX = /^.*(?:(?:youtu.be\/)|(?:v\/)|(?:\/u\/\w\/)|(?:embed\/)|(?:watch\?))\??v?=?([\w-]{11}).*/;

function unescape(string: string) {
  return string.trim()
    .replace( /&/g, '&amp;' )
    .replace( /"/g, '&quot;' )
    .replace( /'/g, '&#39;' )
    .replace( /</g, '&lt;' )
    .replace( />/g, '&gt;' );
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
}

export class ModelQuestion {
  type: string
  id: string
  content: string
  solution: string
  options: ModelQuestionOption[]

  constructor(json: KlausQuestion) {
    this.type = json.type;
    this.id = json.id;
    this.content = json.content;
    this.solution = json.solution;
    this.options = json.options ? json.options.map(option => new ModelQuestionOption(option)) : [];
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
  private steps: ModelStep[]
  id: string
  type: string
  title: string
  content: string
  locked: boolean
  navigate: boolean
  theme: string

  constructor(json: KlausStep, steps: ModelStep[]) {
    this.steps = steps;
    this.id = json.id;
    this.type = json.type;
    this.title = json.title;
    this.content = json.content;
    this.locked = false;
    this.navigate = true;
    this.theme = json.theme || 'light';
  }

  getIndex(): number {
    return this.steps.indexOf(this);
  }

  static fromJSON(json: KlausStep, steps: ModelStep[]): ModelStep {
    switch (json.type) {
      case 'quiz':
        return new ModelStepQuiz(json, steps);
      case 'image':
        return new ModelStepImage(json, steps);
      case 'youtube':
        return new ModelStepYoutube(json, steps);
      // case 'audio':
      //   return new ModelStepAudio(json);
      case 'text':
      case 'hero':
        return new ModelStepText(json, steps);
      default:
        return new ModelStep(json, steps);
    }
  }
}

export class ModelStepQuiz extends ModelStep {
  questions: ModelQuestion[]

  constructor(json: KlausStep, steps: ModelStep[]) {
    super(json, steps);

    this.locked = true;
    this.questions = json.questions ? json.questions.map(question => new ModelQuestion(question)) : [];
  }

  getQuestionsAsCollection(): object {
    return this.questions.reduce((obj: {[index: string]: ModelQuestion}, question) => {
      obj[question.id] = question;

      return obj;
    }, {});
  }
}

export class ModelStepImage extends ModelStep {
  get url(): string {
    return this.content
  }
}

export class ModelStepYoutube extends ModelStep {
  get url(): string {
    return this.content
  }

  get iframeUrl(): string {
    // https://www.youtube.com/embed/SKUZYdnDJBI
    // https://youtu.be/SKUZYdnDJBI
    // https://www.youtube.com/watch?v=SKUZYdnDJBI

    const match = this.url.match(YOUTUBE_REGEX);
    const url = `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&amp;showinfo=0`;

    return url;
  }
}

// Type Audio is not integrated at this time
export class ModelStepAudio extends ModelStep {
  get url(): string {
    return this.content
  }
}

export class ModelStepText extends ModelStep {
  getCompiledContent(params: object = {}): string {
    return Mustache.render(unescape(this.content), params);
  }
}

export default class Model {
  title: string
  minScore: number
  estimatedTime: number
  allowedAttempts: number
  format: string
  steps: ModelStep[]

  constructor(json: KlausRoot) {
    this.title = json.title;
    this.minScore = Number(json.minScore);
    this.estimatedTime = Number(json.estimatedTime);
    this.allowedAttempts = Number(json.allowedAttempts);
    this.format = json.format || '16_9';
    this.steps = json.steps.map(step => ModelStep.fromJSON({ ...step }, this.steps));
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

  static fromJSON(json: KlausRoot): Model {
    return new Model(json);
  }
}
