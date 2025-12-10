import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import QRCode from "react-qr-code";

export function HostView({ onBack }: { onBack: () => void }) {
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const createSession = useMutation(api.sessions.createSession);
  const startGame = useMutation(api.sessions.startGame);
  const endGame = useMutation(api.sessions.endGame);
  const deleteQuestionSet = useMutation(api.sessions.deleteQuestionSet);
  const createQuestionSet = useMutation(api.sessions.createQuestionSet);
  const questionSets = useQuery(api.sessions.getQuestionSets);
  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId } : "skip"
  );
  const leaderboard = useQuery(
    api.sessions.getLeaderboard,
    sessionId ? { sessionId } : "skip"
  );

  const [isCreating, setIsCreating] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [newQuestions, setNewQuestions] = useState<Array<{ question: string; answer: string }>>([
    { question: "", answer: "" }
  ]);

  const handleCreateSession = async () => {
    if (!selectedQuestionSet) return;
    
    setIsCreating(true);
    try {
      const id = await createSession({ questionSetId: selectedQuestionSet });
      setSessionId(id);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSet = async (setId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this question set?")) return;
    try {
      await deleteQuestionSet({ questionSetId: setId as Id<"questionSets"> });
      if (selectedQuestionSet === setId) {
        setSelectedQuestionSet(null);
      }
    } catch (error) {
      alert("Failed to delete question set");
    }
  };

  const handleCreateQuestionSet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validQuestions = newQuestions.filter(q => q.question.trim() && q.answer.trim());
    if (validQuestions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    const questions = validQuestions.map(q => ({
      question: q.question.trim(),
      answer: parseInt(q.answer.trim())
    }));

    if (questions.some(q => isNaN(q.answer))) {
      alert("All answers must be valid numbers");
      return;
    }

    try {
      await createQuestionSet({
        name: newSetName.trim(),
        description: newSetDescription.trim(),
        questions
      });
      setShowCreateForm(false);
      setNewSetName("");
      setNewSetDescription("");
      setNewQuestions([{ question: "", answer: "" }]);
    } catch (error) {
      alert("Failed to create question set");
    }
  };

  const addQuestion = () => {
    setNewQuestions([...newQuestions, { question: "", answer: "" }]);
  };

  const removeQuestion = (index: number) => {
    setNewQuestions(newQuestions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...newQuestions];
    updated[index][field] = value;
    setNewQuestions(updated);
  };

  if (showCreateForm) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Create Question Set</h2>
          <button
            onClick={() => setShowCreateForm(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleCreateQuestionSet} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Set Name</label>
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Advanced Multiplication"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Description</label>
            <input
              type="text"
              value={newSetDescription}
              onChange={(e) => setNewSetDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Practice multiplication tables 13-20"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium dark:text-gray-200">Questions</label>
              <button
                type="button"
                onClick={addQuestion}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                + Add Question
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {newQuestions.map((q, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(index, "question", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-600 dark:text-white mb-2"
                      placeholder="Question (e.g., 13 × 14)"
                      required
                    />
                    <input
                      type="number"
                      value={q.answer}
                      onChange={(e) => updateQuestion(index, "answer", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-600 dark:text-white"
                      placeholder="Answer (e.g., 182)"
                      required
                    />
                  </div>
                  {newQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
            >
              Create Question Set
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Select Question Set</h2>
        
        {!questionSets ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full p-4 text-left rounded-lg border-2 border-dashed border-primary dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
            >
              <h3 className="text-lg font-semibold mb-1 text-primary dark:text-blue-400">+ Create Custom Set</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Add your own questions</p>
            </button>

            {questionSets.map((set) => (
              <div key={set.id} className="relative">
                <button
                  onClick={() => setSelectedQuestionSet(set.id)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedQuestionSet === set.id
                      ? "border-primary bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 dark:text-white">
                        {set.name}
                        {set.isCustom && (
                          <span className="ml-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            Custom
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{set.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{set.questionCount} questions</p>
                    </div>
                    {set.isCustom && set.isOwner && (
                      <button
                        onClick={(e) => handleDeleteSet(set.id, e)}
                        className="ml-2 px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </button>
              </div>
            ))}
            
            <button
              onClick={handleCreateSession}
              disabled={!selectedQuestionSet || isCreating}
              className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isCreating ? "Creating..." : "Create Game"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!session || isCreating) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}?join=${sessionId}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Game Session</h2>

        {session.status === "waiting" && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-center mb-4">
              <p className="text-lg mb-2 dark:text-gray-200">Room Code:</p>
              <div className="bg-primary dark:bg-blue-600 text-white px-8 py-4 rounded-lg">
                <p className="text-5xl font-bold tracking-widest">{session.roomCode}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Players can enter this code to join
              </p>
            </div>
            
            <div className="border-t dark:border-gray-700 pt-4 w-full">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-3">Or scan QR code:</p>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600">
                  <QRCode value={joinUrl} size={150} />
                </div>
              </div>
            </div>

            <button
              onClick={() => sessionId && startGame({ sessionId })}
              disabled={!leaderboard || leaderboard.length === 0}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              Start Game
            </button>
          </div>
        )}

        {session.status === "active" && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Game in Progress
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Room Code: <span className="font-mono font-bold">{session.roomCode}</span></p>
              </div>
              <button
                onClick={() => sessionId && endGame({ sessionId })}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition-colors"
              >
                End Game
              </button>
            </div>
          </div>
        )}

        {session.status === "ended" && (
          <div className="flex flex-col gap-4">
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Game Ended</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Final Results Below</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-primary text-white font-semibold rounded hover:bg-primary-hover transition-colors"
            >
              Create New Game
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Leaderboard</h2>
        {!leaderboard || leaderboard.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No players yet...</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((player, index) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
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
                    <p className="font-semibold text-lg dark:text-white">{player.name}</p>
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
        )}
      </div>
    </div>
  );
}
