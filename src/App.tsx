import { Toaster } from "sonner";
import { HostView } from "./HostView";
import { PlayerView } from "./PlayerView";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const [mode, setMode] = useState<"host" | "player" | "signin" | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const user = useQuery(api.auth.loggedInUser);

  useEffect(() => {
    // Check if URL has join parameter - if so, force player mode
    const params = new URLSearchParams(window.location.search);
    if (params.get("join")) {
      setMode("player");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm h-16 flex justify-between items-center border-b dark:border-gray-700 shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary dark:text-blue-400">Math Competition</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "🌞" : "🌙"}
          </button>
          {user && !user.isAnonymous && (
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-sm">
              {user.name || user.email}
            </div>
          )}
          {mode && (
            <button
              onClick={() => setMode(null)}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors dark:text-white"
            >
              Back
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <Content mode={mode} setMode={setMode} user={user} />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content({
  mode,
  setMode,
  user,
}: {
  mode: "host" | "player" | "signin" | null;
  setMode: (mode: "host" | "player" | "signin" | null) => void;
  user: any;
}) {
  // Check if user came from QR code - if so, don't show host option
  const params = new URLSearchParams(window.location.search);
  const isFromQRCode = params.get("join") !== null;

  // Only show host option if user is authenticated and not anonymous
  const canHost = user && !user.isAnonymous;

  if (!mode) {
    return (
      <div className="flex flex-col gap-8 items-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-primary dark:text-blue-400 mb-4">
            Math Competition
          </h1>
          <p className="text-xl text-secondary dark:text-gray-300 mb-8">
            Choose your role to get started
          </p>
        </div>
        <div className="flex gap-4 flex-wrap justify-center">
          {!isFromQRCode && canHost && (
            <button
              onClick={() => setMode("host")}
              className="px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-lg text-lg"
            >
              Host a Game
            </button>
          )}
          {!isFromQRCode && !canHost && (
            <button
              onClick={() => setMode("signin")}
              className="px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-lg text-lg"
            >
              Sign In to Host
            </button>
          )}
          <button
            onClick={() => setMode("player")}
            className="px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg text-lg"
          >
            Join a Game
          </button>
        </div>
      </div>
    );
  }

  if (mode === "signin") {
    return <SignInView user={user} setMode={setMode} />;
  }

  if (mode === "host") {
    if (!canHost) {
      setMode("signin");
      return null;
    }
    return <HostView onBack={() => setMode(null)} />;
  }

  if (mode === "player") {
    return <PlayerView onBack={() => setMode(null)} />;
  }

  return null;
}

function SignInView({ 
  user, 
  setMode 
}: { 
  user: any; 
  setMode: (mode: "host" | "player" | "signin" | null) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Host Sign In</h2>
      <SignInForm />
      {user && !user.isAnonymous && (
        <div className="mt-6 pt-6 border-t dark:border-gray-700">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
            Signed in as {user.name || user.email}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("host")}
              className="flex-1 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
            >
              Continue to Host
            </button>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
