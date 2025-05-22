
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  value: number;
}

export enum GameState {
  WELCOME,
  LOADING_QUESTIONS,
  QUESTION_ASKING,
  ANSWER_SELECTED,
  REVEALING_ANSWER,
  GAME_OVER,
  GAME_WON,
  USING_LIFELINE_AUDIENCE,
  USING_LIFELINE_AI_HINT,
}

export interface LifelineState {
  fiftyFifty: boolean; // true if used
  askAudience: boolean; // true if used
  askAI: boolean; // true if used
}

export interface AudienceVote {
  option: string;
  percentage: number;
}
    