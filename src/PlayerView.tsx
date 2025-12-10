import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

export function PlayerView({ onBack }: { onBack: () => void }) {
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [playerId, setPlayerId] = useState<Id<"players"> | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showSkipped, setShowSkipped] = useState(false);
  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null);

  const joinSession = useMutation(api.players.joinSession);
  const submitAnswer = useMutation(api.players.submitAnswer);
  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId } : "skip"
  );
  const sessionByCode = useQuery(
    api.sessions.getSessionByRoomCode,
    roomCode && !sessionId ? { roomCode: roomCode.toUpperCase() } : "skip"
  );
  const progress = useQuery(
    api.players.getPlayerProgress,
    playerId ? { playerId } : "skip"
  );
  const leaderboard = useQuery(
    api.sessions.getLeaderboard,
    sessionId ? { sessionId } : "skip"
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get("join");
    if (joinParam) {
      setSessionId(joinParam as Id<"sessions">);
    }
  }, []);

  useEffect(() => {
    if (sessionByCode && !sessionId) {
      setSessionId(sessionByCode._id);
    }
  }, [sessionByCode, sessionId]);

  const handleBack = () => {
    setSessionId(null);
    setPlayerId(null);
    setPlayerName("");
    setRoomCode("");
    setCurrentQuestionIndex(0);
    setAnswer("");
    setShowSkipped(false);
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
    onBack();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !playerName.trim()) return;

    try {
      const id = await joinSession({
        sessionId,
        name: playerName.trim(),
      });
      setPlayerId(id);
      toast.success("Joined successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join session"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !answer.trim()) return;

    const numAnswer = parseInt(answer.trim());
    if (isNaN(numAnswer)) {
      toast.error("Please enter a valid number");
      return;
    }

    try {
      const result = await submitAnswer({
        playerId,
        questionIndex: currentQuestionIndex,
        answer: numAnswer,
      });

      if (result.isCorrect) {
        setFlashColor("green");
        toast.success("Correct! 🎉");
        setAnswer("");
        setTimeout(() => {
          setFlashColor(null);
          moveToNextUnanswered();
        }, 500);
      } else {
        setFlashColor("red");
        toast.error("Incorrect!");
        setAnswer("");
        setTimeout(() => {
          setFlashColor(null);
          moveToNextUnanswered();
        }, 500);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit answer"
      );
    }
  };

  const moveToNextUnanswered = () => {
    if (!progress) return;

    for (
      let i = currentQuestionIndex + 1;
      i < progress.totalQuestions;
      i++
    ) {
      if (!progress.answeredQuestions.includes(i)) {
        setCurrentQuestionIndex(i);
        setShowSkipped(false);
        return;
      }
    }

    for (let i = 0; i < currentQuestionIndex; i++) {
      if (!progress.answeredQuestions.includes(i)) {
        setCurrentQuestionIndex(i);
        setShowSkipped(false);
        return;
      }
    }
  };

  const handleSkip = () => {
    moveToNextUnanswered();
  };

  const handleGiveUp = async () => {
    if (!playerId) return;

    try {
      await submitAnswer({
        playerId,
        questionIndex: currentQuestionIndex,
        answer: -999999,
      });

      toast.error("Question marked as incorrect");
      setAnswer("");
      moveToNextUnanswered();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to give up"
      );
    }
  };

  if (!sessionId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Join a Game</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (roomCode.trim().length === 6) {
            // Query will trigger via useEffect
          } else {
            toast.error("Please enter a valid 6-character room code");
          }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 text-2xl text-center font-mono font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase tracking-widest dark:bg-gray-700 dark:text-white"
              placeholder="ABC123"
              maxLength={6}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              Enter the 6-character code from the host
            </p>
          </div>
          <button
            type="submit"
            disabled={roomCode.trim().length !== 6}
            className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Find Game
          </button>
        </form>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Join Game</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Room Code: <span className="font-mono font-bold text-lg">{session.roomCode}</span>
        </p>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter your name"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            Join Game
          </button>
        </form>
      </div>
    );
  }

  if (session.status === "waiting") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Waiting for Game to Start</h2>
        <p className="text-gray-600 dark:text-gray-300">
          The host will start the game soon. Get ready!
        </p>
        <div className="mt-6">
          <div className="animate-pulse text-4xl">⏳</div>
        </div>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">Game Ended</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Thanks for playing!</p>
          {progress && (
            <div className="text-lg">
              <p className="font-semibold dark:text-gray-200">Your Score:</p>
              <p className="text-3xl text-primary dark:text-blue-400 font-bold">
                {progress.correctCount}/{progress.totalQuestions}
              </p>
            </div>
          )}
          <button
            onClick={handleBack}
            className="mt-6 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            Join Another Game
          </button>
        </div>

        {leaderboard && leaderboard.length > 0 && (
          <div className="mt-6 pt-6 border-t dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-center dark:text-white">Final Leaderboard</h3>
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    player.playerId === playerId
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`text-2xl font-bold w-8 ${
                        index === 0
                          ? "text-yellow-500"
                          : index === 1
                            ? "text-gray-400"
                            : index === 2
                              ? "text-orange-600"
                              : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-lg dark:text-white">
                        {player.name}
                        {player.playerId === playerId && (
                          <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {player.questionsAnswered}/{player.totalQuestions}{" "}
                        questions answered
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary dark:text-blue-400">
                      {player.correctCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(player.totalTime / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const skippedQuestions = Array.from(
    { length: progress.totalQuestions },
    (_, i) => i
  ).filter((i) => !progress.answeredQuestions.includes(i));

  const allAnswered = progress.answeredQuestions.length === progress.totalQuestions;

  if (allAnswered) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">All Questions Answered! 🎉</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Great job! {session.status === "active" ? "Wait for the game to end to see final results." : "Here are the final results."}
          </p>
          <div className="text-lg">
            <p className="font-semibold dark:text-gray-200">Your Score:</p>
            <p className="text-3xl text-primary dark:text-blue-400 font-bold">
              {progress.correctCount}/{progress.totalQuestions}
            </p>
          </div>
        </div>

        {leaderboard && leaderboard.length > 0 && (
          <div className="mt-6 pt-6 border-t dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-center dark:text-white">Leaderboard</h3>
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    player.playerId === playerId
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`text-2xl font-bold w-8 ${
                        index === 0
                          ? "text-yellow-500"
                          : index === 1
                            ? "text-gray-400"
                            : index === 2
                              ? "text-orange-600"
                              : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-lg dark:text-white">
                        {player.name}
                        {player.playerId === playerId && (
                          <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {player.questionsAnswered}/{player.totalQuestions}{" "}
                        questions answered
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary dark:text-blue-400">
                      {player.correctCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(player.totalTime / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = progress.session.questions[currentQuestionIndex];
  const isAnswered = progress.answeredQuestions.includes(currentQuestionIndex);

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 -mt-32 max-w-md mx-auto transition-all duration-300 ${
        flashColor === "green" ? "ring-8 ring-green-500" : 
        flashColor === "red" ? "ring-8 ring-red-500" : ""
      }`}
    >
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Question {currentQuestionIndex + 1} of {progress.totalQuestions}
          </p>
          <p className="text-sm font-semibold text-primary dark:text-blue-400">
            Score: {progress.correctCount}/{progress.totalQuestions}
          </p>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary dark:bg-blue-500 h-2 rounded-full transition-all"
            style={{
              width: `${(progress.answeredQuestions.length / progress.totalQuestions) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {!showSkipped ? (
        <>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-center mb-6 dark:text-white">
              {currentQuestion.question}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="number"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-4 py-3 text-2xl text-center border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Your answer"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleGiveUp}
                className="px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Give Up
              </button>
            </div>
          </form>

          {skippedQuestions.length > 0 && (
            <div className="mt-6 pt-6 border-t dark:border-gray-700">
              <button
                onClick={() => setShowSkipped(true)}
                className="w-full px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 font-semibold rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
              >
                View Skipped Questions ({skippedQuestions.length})
              </button>
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold dark:text-white">Skipped Questions</h3>
            <button
              onClick={() => setShowSkipped(false)}
              className="text-sm text-primary dark:text-blue-400 hover:underline"
            >
              Back to Current
            </button>
          </div>
          <div className="space-y-2">
            {skippedQuestions.map((qIndex) => (
              <button
                key={qIndex}
                onClick={() => {
                  setCurrentQuestionIndex(qIndex);
                  setShowSkipped(false);
                }}
                className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">Question {qIndex + 1}</p>
                <p className="font-semibold dark:text-white">
                  {progress.session.questions[qIndex].question}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
