
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Question, LifelineState, AudienceVote } from './types';
import { PRIZE_LEVELS, TOTAL_QUESTIONS, GUARANTEED_LEVEL_INDICES, GEMINI_MODEL_TEXT } from './constants';
import { fetchQuestionsFromGemini, getAIHintFromGemini } from './services/geminiService';
// FIX: Import 'stopMusic' from audioService.
import { playSound, playMusic, stopMusic, stopAllMusic, toggleMute as toggleAudioMute, setGlobalVolume } from './services/audioService';
import MoneyTree from './components/MoneyTree';
import LoadingIndicator from './components/LoadingIndicator';
import AudienceVoteDisplay from './components/AudienceVoteDisplay';
import AIHintDisplay from './components/AIHintDisplay';
import LifelineButton from './components/LifelineButton';
import { FiftyFiftyIcon, AudienceIcon, AskAIIcon, SoundOnIcon, SoundOffIcon, WalkAwayIcon } from './components/IconComponents';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [lifelines, setLifelines] = useState<LifelineState>({ fiftyFifty: false, askAudience: false, askAI: false });
  const [score, setScore] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [audienceVotes, setAudienceVotes] = useState<AudienceVote[]>([]);
  const [aiHint, setAiHint] = useState<string>('');
  const [isLoadingAIHint, setIsLoadingAIHint] = useState<boolean>(false);
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showConfirmButton, setShowConfirmButton] = useState<boolean>(false);

  const loadQuestions = useCallback(async () => {
    setGameState(GameState.LOADING_QUESTIONS);
    const fetchedQuestions = await fetchQuestionsFromGemini();
    if (fetchedQuestions && fetchedQuestions.length > 0) {
        const questionsWithValues = fetchedQuestions.map((q, index) => ({
        ...q,
        value: PRIZE_LEVELS[index] || 0,
        id: q.id || `q-${index}-${Date.now()}` 
      }));
      setQuestions(questionsWithValues);
      setGameState(GameState.QUESTION_ASKING);
      playMusic('background');
    } else {
      // Handle error or no questions fetched - maybe show an error message and stay on welcome or an error screen
      console.error("Failed to load questions.");
      setGameState(GameState.WELCOME); // Or a new Error state
      alert("عذرًا، حدث خطأ أثناء تحميل الأسئلة. يرجى المحاولة مرة أخرى.");
    }
  }, []);

  const resetGame = useCallback(() => {
    stopAllMusic();
    setLifelines({ fiftyFifty: false, askAudience: false, askAI: false });
    setSelectedAnswer(null);
    setDisabledOptions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setFinalScore(0);
    setShowConfirmButton(false);
    // loadQuestions(); // Now called from StartGame button
    setGameState(GameState.WELCOME);
  }, []);
  
  useEffect(() => {
    // preloadSounds(); // Optional: preload sounds when app loads
    setGlobalVolume(0.3); // Set initial volume
  }, []);


  const handleStartGame = () => {
    resetGame();
    loadQuestions(); // Fetch questions when starting the game
  };


  const currentQuestion = questions[currentQuestionIndex];

  const handleSelectAnswer = (option: string) => {
    if (gameState === GameState.QUESTION_ASKING) {
      setSelectedAnswer(option);
      setShowConfirmButton(true);
      // playSound('select'); // A sound for selecting an option
    }
  };

  const handleConfirmAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;

    setShowConfirmButton(false);
    setGameState(GameState.REVEALING_ANSWER);
    playSound('finalAnswer');
    // FIX: Corrected function name from stopMusic to stopMusic (it was a typo in the error, actual fix is in imports)
    // This line was actually correct, the error was about 'stopMusic' not being found due to missing import.
    // The import has been fixed.
    if (currentQuestionIndex +1 < TOTAL_QUESTIONS) stopMusic('suspense'); // Stop suspense if it was playing for the current question

    setTimeout(() => {
      if (selectedAnswer === currentQuestion.correctAnswer) {
        playSound('correct');
        const newScore = PRIZE_LEVELS[currentQuestionIndex];
        setScore(newScore);
        if (currentQuestionIndex === TOTAL_QUESTIONS - 1) {
          setFinalScore(newScore);
          setGameState(GameState.GAME_WON);
          stopAllMusic(); // play win music?
        } else {
           setTimeout(() => {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setDisabledOptions([]);
            setGameState(GameState.QUESTION_ASKING);
            if (currentQuestionIndex +1 < TOTAL_QUESTIONS) playMusic('suspense'); // Start suspense for next q
          }, 3000); // Delay before next question
        }
      } else {
        playSound('wrong');
        let calculatedFinalScore = 0;
        for (let i = GUARANTEED_LEVEL_INDICES.length - 1; i >= 0; i--) {
          if (currentQuestionIndex > GUARANTEED_LEVEL_INDICES[i]) {
            calculatedFinalScore = PRIZE_LEVELS[GUARANTEED_LEVEL_INDICES[i]];
            break;
          }
        }
        setFinalScore(calculatedFinalScore);
        setGameState(GameState.GAME_OVER);
        stopAllMusic();
      }
    }, 3000); // Delay for revealing answer
  };

  const handleUseFiftyFifty = () => {
    if (!currentQuestion || lifelines.fiftyFifty || gameState !== GameState.QUESTION_ASKING) return;
    playSound('lifeline');
    setLifelines(prev => ({ ...prev, fiftyFifty: true }));
    const correctAnswer = currentQuestion.correctAnswer;
    const incorrectOptions = currentQuestion.options.filter(opt => opt !== correctAnswer);
    const shuffledIncorrect = incorrectOptions.sort(() => 0.5 - Math.random());
    const optionsToKeep = [correctAnswer, shuffledIncorrect[0]];
    const optionsToRemove = currentQuestion.options.filter(opt => !optionsToKeep.includes(opt));
    setDisabledOptions(optionsToRemove);
  };

  const handleUseAskAudience = () => {
    if (!currentQuestion || lifelines.askAudience || gameState !== GameState.QUESTION_ASKING) return;
    playSound('lifeline');
    setLifelines(prev => ({ ...prev, askAudience: true }));
    setGameState(GameState.USING_LIFELINE_AUDIENCE);

    // Simulate audience votes (skewed towards correct answer)
    const votes: AudienceVote[] = currentQuestion.options.map(option => {
      let percentage = Math.floor(Math.random() * 30) + 10; // Base random percentage
      if (option === currentQuestion.correctAnswer) {
        percentage += Math.floor(Math.random() * 30) + 25; // Boost for correct answer
      }
      return { option, percentage };
    });

    // Normalize percentages
    const totalPercentage = votes.reduce((sum, vote) => sum + vote.percentage, 0);
    const normalizedVotes = votes.map(vote => ({
      ...vote,
      percentage: Math.min(100, Math.round((vote.percentage / totalPercentage) * 100)),
    }));
    
    // Ensure sum is 100, adjust largest if needed
    let currentSum = normalizedVotes.reduce((acc,v) => acc + v.percentage, 0);
    if(currentSum !== 100 && normalizedVotes.length > 0) {
        const diff = 100 - currentSum;
        normalizedVotes.sort((a,b) => b.percentage - a.percentage); // sort descending
        normalizedVotes[0].percentage += diff;
    }


    setAudienceVotes(normalizedVotes);
  };

  const handleUseAskAI = async () => {
    if (!currentQuestion || lifelines.askAI || gameState !== GameState.QUESTION_ASKING) return;
    playSound('lifeline');
    setLifelines(prev => ({ ...prev, askAI: true }));
    setGameState(GameState.USING_LIFELINE_AI_HINT);
    setIsLoadingAIHint(true);
    const hint = await getAIHintFromGemini(currentQuestion.question, currentQuestion.options);
    setAiHint(hint);
    setIsLoadingAIHint(false);
  };
  
  const handleWalkAway = () => {
    if (gameState !== GameState.QUESTION_ASKING && gameState !== GameState.ANSWER_SELECTED) return;
    setFinalScore(score); // current score becomes final score
    setGameState(GameState.GAME_OVER);
    stopAllMusic();
    // play walk away sound?
  };

  const handleToggleMute = () => {
    const newMuteState = toggleAudioMute();
    setIsMuted(newMuteState);
  };


  useEffect(() => {
    if (gameState === GameState.QUESTION_ASKING && currentQuestionIndex < TOTAL_QUESTIONS) {
      playMusic('suspense');
    } else if (gameState === GameState.WELCOME) {
        stopAllMusic(); // Ensure music stops on welcome screen
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentQuestionIndex]);


  if (gameState === GameState.LOADING_QUESTIONS && !currentQuestion) {
    return <LoadingIndicator text="جارٍ إعداد الأسئلة..." />;
  }
  
  if (gameState === GameState.WELCOME) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-8">
        <img src="https://picsum.photos/seed/millionairelogo/300/150" alt="Game Logo" className="mb-8 rounded-lg shadow-xl"/>
        <h1 className="text-5xl font-bold text-amber-400 mb-4">من سيربح المليون؟</h1>
        <p className="text-xl text-gray-300 mb-12">هل أنت مستعد لاختبار معلوماتك والفوز بالجائزة الكبرى؟</p>
        <button
          onClick={handleStartGame}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 text-2xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          إبدأ اللعبة
        </button>
         <button onClick={handleToggleMute} className="absolute top-4 right-4 p-2 bg-slate-700 rounded-full hover:bg-slate-600">
          {isMuted ? <SoundOffIcon className="w-6 h-6 text-amber-400" /> : <SoundOnIcon className="w-6 h-6 text-amber-400" />}
        </button>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER || gameState === GameState.GAME_WON) {
    const message = gameState === GameState.GAME_WON ? "تهانينا! لقد ربحت المليون!" : "للأسف! انتهت اللعبة.";
    const finalAmount = gameState === GameState.GAME_WON ? PRIZE_LEVELS[TOTAL_QUESTIONS -1] : finalScore;
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-8">
        <h1 className={`text-5xl font-bold mb-6 ${gameState === GameState.GAME_WON ? 'text-green-400' : 'text-red-500'}`}>{message}</h1>
        <p className="text-3xl text-amber-400 mb-10">لقد فزت بـ: {finalAmount.toLocaleString()} ريال</p>
        <button
          onClick={handleStartGame}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          إلعب مرة أخرى
        </button>
         <button onClick={handleToggleMute} className="absolute top-4 right-4 p-2 bg-slate-700 rounded-full hover:bg-slate-600">
          {isMuted ? <SoundOffIcon className="w-6 h-6 text-amber-400" /> : <SoundOnIcon className="w-6 h-6 text-amber-400" />}
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return <LoadingIndicator text="لا توجد أسئلة متاحة حاليًا." />;
  }


  const getOptionClass = (option: string): string => {
    if (gameState === GameState.REVEALING_ANSWER) {
      if (option === currentQuestion.correctAnswer) return 'correct';
      if (option === selectedAnswer && option !== currentQuestion.correctAnswer) return 'incorrect';
    }
    if (option === selectedAnswer && (gameState === GameState.QUESTION_ASKING || gameState === GameState.ANSWER_SELECTED)) return 'selected';
    return '';
  };


  return (
    <div className="flex flex-col md:flex-row items-stretch justify-between h-screen w-screen p-2 md:p-4 lg:p-6 max-w-screen-2xl mx-auto overflow-hidden">
      {/* Left Panel (Lifelines & Controls) */}
      <div className="w-full md:w-1/5 flex md:flex-col justify-around md:justify-start items-center p-2 md:space-y-4 order-2 md:order-1">
        <div className="flex flex-row md:flex-col items-center space-x-2 md:space-x-0 md:space-y-3">
            <LifelineButton icon={<FiftyFiftyIcon className="w-full h-full"/>} onClick={handleUseFiftyFifty} isUsed={lifelines.fiftyFifty} isDisabled={gameState !== GameState.QUESTION_ASKING} label="50:50"/>
            <LifelineButton icon={<AudienceIcon className="w-full h-full"/>} onClick={handleUseAskAudience} isUsed={lifelines.askAudience} isDisabled={gameState !== GameState.QUESTION_ASKING} label="اسأل الجمهور"/>
            <LifelineButton icon={<AskAIIcon className="w-full h-full"/>} onClick={handleUseAskAI} isUsed={lifelines.askAI} isDisabled={gameState !== GameState.QUESTION_ASKING} label="اسأل الذكاء الاصطناعي"/>
        </div>
        <div className="flex flex-row md:flex-col items-center space-x-2 md:space-x-0 md:space-y-3 mt-auto">
            <button 
                onClick={handleWalkAway} 
                disabled={gameState !== GameState.QUESTION_ASKING && gameState !== GameState.ANSWER_SELECTED}
                className="lifeline-button flex flex-col items-center justify-center p-2 m-1 w-20 h-20 md:w-24 md:h-24 bg-red-600 hover:bg-red-700 rounded-full shadow-lg text-white transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
                title="انسحاب"
            >
                <WalkAwayIcon className="w-8 h-8 md:w-10 md:h-10 text-white"/>
            </button>
             <button onClick={handleToggleMute} className="p-3 bg-slate-700 rounded-full hover:bg-slate-600">
                {isMuted ? <SoundOffIcon className="w-7 h-7 text-amber-400" /> : <SoundOnIcon className="w-7 h-7 text-amber-400" />}
            </button>
        </div>
      </div>

      {/* Center Panel (Question & Options) */}
      <div className={`flex-grow flex flex-col justify-center items-center p-2 md:px-8 order-1 md:order-2 ${gameState === GameState.QUESTION_ASKING && (currentQuestionIndex >= (TOTAL_QUESTIONS - 5)) ? 'suspense-bg' : ''}`}>
        <div className="w-full max-w-3xl mb-6 md:mb-12">
          <div className="bg-slate-800 bg-opacity-80 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl border-2 border-amber-500 min-h-[100px] md:min-h-[120px] flex items-center justify-center">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-100">{currentQuestion.question}</p>
          </div>
        </div>

        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {currentQuestion.options.map((option, index) => (
            <button
              key={`${currentQuestion.id}-option-${index}`}
              onClick={() => handleSelectAnswer(option)}
              disabled={
                gameState === GameState.REVEALING_ANSWER || 
                disabledOptions.includes(option) || 
                (gameState === GameState.ANSWER_SELECTED && selectedAnswer !== option && selectedAnswer !== null) // Disable other options once one is selected and waiting for confirm
              }
              className={`option-button w-full p-3 md:p-4 text-base md:text-lg font-semibold text-gray-100 bg-slate-700 bg-opacity-70 border-2 border-slate-600 rounded-lg shadow-md transition-all duration-200 ease-in-out hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-600 ${getOptionClass(option)}`}
            >
              {option}
            </button>
          ))}
        </div>
        
        {showConfirmButton && gameState === GameState.QUESTION_ASKING && selectedAnswer && (
          <button
            onClick={handleConfirmAnswer}
            className="mt-8 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105 animate-pulse"
          >
            تأكيد الإجابة؟
          </button>
        )}
      </div>

      {/* Right Panel (Money Tree) */}
      <div className="w-full md:w-1/5 flex justify-center md:justify-end p-2 order-3 md:order-3">
        {/* FIX: Changed isGameActive prop to true as gameState will always be an active state here due to parent conditional rendering. */}
        <MoneyTree currentQuestionIndex={currentQuestionIndex} isGameActive={true}/>
      </div>

      {/* Modals for Lifelines */}
      {gameState === GameState.USING_LIFELINE_AUDIENCE && (
        <AudienceVoteDisplay votes={audienceVotes} onClose={() => setGameState(GameState.QUESTION_ASKING)} />
      )}
      {gameState === GameState.USING_LIFELINE_AI_HINT && (
        <AIHintDisplay hint={aiHint} isLoading={isLoadingAIHint} onClose={() => setGameState(GameState.QUESTION_ASKING)} />
      )}
    </div>
  );
};

export default App;
