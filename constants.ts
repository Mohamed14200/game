
export const PRIZE_LEVELS: number[] = [
  100, 200, 300, 500, 1000, // Guaranteed at 1000 (index 4)
  2000, 4000, 8000, 16000, 32000, // Guaranteed at 32000 (index 9)
  64000, 125000, 250000, 500000, 1000000,
];

export const GUARANTEED_LEVEL_INDICES: number[] = [4, 9]; // 0-indexed

export const TOTAL_QUESTIONS: number = PRIZE_LEVELS.length;

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

export const CORRECT_SOUND_URL = 'audio/correct.mp3';
export const WRONG_SOUND_URL = 'audio/wrong.mp3';
export const LIFELINE_SOUND_URL = 'audio/lifeline.mp3';
export const BACKGROUND_MUSIC_URL = 'audio/background_loop.mp3';
export const SUSPENSE_MUSIC_URL = 'audio/suspense.mp3';
export const FINAL_ANSWER_SOUND_URL = 'audio/final_answer.mp3';
export const EASY_QUESTIONS_COUNT = 5;
export const MEDIUM_QUESTIONS_COUNT = 5;
export const HARD_QUESTIONS_COUNT = 5;