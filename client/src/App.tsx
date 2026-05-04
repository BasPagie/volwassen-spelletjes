import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Landing from "./pages/Landing";
import Join from "./pages/Join";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Results from "./pages/Results";
import TestCharacters from "./pages/TestCharacters";
import TestSongs from "./pages/TestSongs";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer from "./components/ToastContainer";
import PageTransition from "./components/PageTransition";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Landing />
            </PageTransition>
          }
        />
        <Route
          path="/test/characters"
          element={
            <PageTransition>
              <TestCharacters />
            </PageTransition>
          }
        />
        <Route
          path="/test/songs"
          element={
            <PageTransition>
              <TestSongs />
            </PageTransition>
          }
        />
        <Route
          path="/join/:roomId"
          element={
            <PageTransition>
              <Join />
            </PageTransition>
          }
        />
        <Route
          path="/lobby/:roomId"
          element={
            <PageTransition>
              <Lobby />
            </PageTransition>
          }
        />
        <Route
          path="/game/:roomId"
          element={
            <PageTransition>
              <Game />
            </PageTransition>
          }
        />
        <Route
          path="/results/:roomId"
          element={
            <PageTransition>
              <Results />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <ToastContainer />
        <AnimatedRoutes />
      </div>
    </ErrorBoundary>
  );
}
