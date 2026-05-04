import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { saveSession, clearSession } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { playSound } from './useSoundEffect';

let toastId = 0;
function nextToastId() { return `toast-${++toastId}`; }

export function useSocketEvents() {
  const socket = useSocket();
  const { state: gameState, dispatch } = useGame();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const isSpectatorRef = useRef(false);
  isSpectatorRef.current = !!(gameState.player?.isHost && gameState.room?.gameCategory === 'snelste-vinger' && !gameState.room?.snelsteVingerSettings?.hostPlays);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', ({ room, player }) => {
      dispatch({ type: 'SET_PLAYER', player });
      dispatch({ type: 'SET_ROOM', room });
      saveSession(room.roomId, player.id);
      navigateRef.current(`/lobby/${room.roomId}`);
    });

    socket.on('room-joined', ({ room, player }) => {
      dispatch({ type: 'SET_PLAYER', player });
      dispatch({ type: 'SET_ROOM', room });
      saveSession(room.roomId, player.id);
      if (room.status === 'lobby') {
        navigateRef.current(`/lobby/${room.roomId}`);
      }
    });

    socket.on('player-joined', ({ player }) => {
      dispatch({ type: 'PLAYER_JOINED', player });
      playSound('join');
      dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `${player.nickname} doet mee!`, type: 'info' } });
    });

    socket.on('player-left', ({ playerId, newHostId, disconnected }) => {
      dispatch({ type: 'PLAYER_LEFT', playerId, newHostId, disconnected });
      if (!disconnected) {
        playSound('wrong');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: 'Een speler heeft het spel verlaten', type: 'warning' } });
      }
    });

    socket.on('settings-updated', (settings) => {
      dispatch({ type: 'SETTINGS_UPDATED', settings });
    });

    socket.on('game-started', () => {
      dispatch({ type: 'GAME_STARTED' });
      playSound('gameStart');
    });

    socket.on('countdown', ({ count }) => {
      dispatch({ type: 'COUNTDOWN', count });
      if (count <= 3) playSound('tick');
    });

    socket.on('score-updated', ({ playerId, score }) => {
      dispatch({ type: 'SCORE_UPDATED', playerId, score });
    });

    socket.on('round-start', ({ roundState, roundIndex }) => {
      dispatch({ type: 'CLEAR_BRIEFING' });
      dispatch({ type: 'ROUND_START', roundState, roundIndex });
    });

    socket.on('briefing-start', ({ briefingKey, roundType, gameCategory }) => {
      dispatch({ type: 'SET_BRIEFING', briefingKey, roundType, gameCategory });
    });

    socket.on('briefing-ready-count', ({ ready, total }) => {
      dispatch({ type: 'BRIEFING_READY_COUNT', ready, total });
    });

    socket.on('group-result', ({ roundState, hintWords }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState, hintWords });
    });

    socket.on('answer-result', ({ correct, roundState }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState, answerResult: { correct } });
      playSound(correct ? 'correct' : 'wrong');
      dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: correct ? 'Goed antwoord! 🎉' : 'Helaas, fout antwoord', type: correct ? 'success' : 'error' } });
    });

    socket.on('opendeur-result', ({ correct, matchedAnswer, roundState, questionComplete }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
      if (correct) {
        playSound('correct');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `Correct: ${matchedAnswer}! 🎉`, type: 'success' } });
      } else {
        playSound('wrong');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: 'Helaas, dat is niet goed', type: 'error' } });
      }
    });

    socket.on('opendeur-next-question', ({ roundState, previousAnswers }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
    });

    socket.on('lingo-result', ({ correct, feedback, roundState }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
      if (correct) {
        playSound('correct');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: 'Woord geraden! 🎉', type: 'success' } });
      }
    });

    socket.on('lingo-next-word', ({ roundState, previousWord }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
    });

    socket.on('player-progress', (progress) => {
      dispatch({ type: 'PLAYER_PROGRESS', progress });
    });

    socket.on('round-end', (result) => {
      dispatch({ type: 'ROUND_END', result });
      playSound('roundEnd');
    });

    socket.on('game-end', (results) => {
      dispatch({ type: 'GAME_END', results });
    });

    socket.on('error', ({ message }) => {
      console.error('[Game Error]', message);
      dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message, type: 'error' } });
    });

    socket.on('time-update', ({ timeRemainingMs }) => {
      dispatch({ type: 'TIME_UPDATE', timeRemainingMs });
    });

    socket.on('room-closed', () => {
      clearSession();
      dispatch({ type: 'RESET' });
      navigateRef.current('/');
    });

    socket.on('kicked', () => {
      dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: 'Je bent uit het spel verwijderd', type: 'error' } });
      clearSession();
      dispatch({ type: 'RESET' });
      navigateRef.current('/');
    });

    socket.on('dev-mode-status', ({ enabled }) => {
      dispatch({ type: 'SET_DEV_MODE', enabled });
    });

    socket.on('reconnected', ({ room, player, roundState, phase, roundResult, finalResults, playerProgress }) => {
      dispatch({
        type: 'RECONNECTED',
        room,
        player,
        roundState,
        phase,
        roundResult,
        finalResults,
        playerProgress,
      });
      saveSession(room.roomId, player.id);
      // Navigate to the right page
      if (phase === 'finished') {
        navigateRef.current(`/results/${room.roomId}`);
      } else if (phase === 'lobby') {
        navigateRef.current(`/lobby/${room.roomId}`);
      } else {
        navigateRef.current(`/game/${room.roomId}`);
      }
    });

    socket.on('reconnect-failed', () => {
      clearSession();
      dispatch({ type: 'RESET' });
      navigateRef.current('/');
    });

    // ─── Wie Ben Ik? ─────────────────────────────────────
    socket.on('whatami:settings-updated', (settings) => {
      dispatch({ type: 'WHATAMI_SETTINGS_UPDATED', settings });
    });

    socket.on('whatami:state-update', (state) => {
      dispatch({ type: 'CLEAR_BRIEFING' });
      dispatch({ type: 'SET_WHATAMI_STATE', state });
    });

    socket.on('whatami:guess-result', ({ correct, cooldownUntil, characterName }) => {
      dispatch({ type: 'WHATAMI_GUESS_RESULT', correct, cooldownUntil, characterName });
      playSound(correct ? 'correct' : 'wrong');
      dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: correct ? `🎉 Goed geraden: ${characterName}!` : 'Niet goed, probeer opnieuw', type: correct ? 'success' : 'error' } });
    });

    socket.on('whatami:player-guessed', ({ playerId, placement, score }) => {
      dispatch({ type: 'WHATAMI_PLAYER_GUESSED', playerId, placement, score });
      dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `Een speler heeft het geraden! 🏆`, type: 'info' } });
    });

    socket.on('whatami:game-end', (state) => {
      dispatch({ type: 'WHATAMI_GAME_END', state });
    });

    socket.on('hint-given', ({ hint }) => {
      dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `💡 Hint: ${hint}`, type: 'info' } });
    });

    // ─── Snelste Vinger ──────────────────────────────────
    socket.on('snelstevinger:settings-updated', (settings) => {
      dispatch({ type: 'SNELSTEVINGER_SETTINGS_UPDATED', settings });
    });

    socket.on('snelstevinger:question', (state) => {
      dispatch({ type: 'CLEAR_BRIEFING' });
      dispatch({ type: 'SET_SNELSTEVINGER_STATE', state });
    });

    socket.on('snelstevinger:buzz-result', ({ correct }) => {
      if (isSpectatorRef.current) return;
      playSound(correct ? 'correct' : 'wrong');
      if (!correct) {
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: '❌ Fout! Probeer opnieuw', type: 'error' } });
      }
    });

    socket.on('snelstevinger:question-won', ({ winnerName, correctAnswer, scores }) => {
      if (!isSpectatorRef.current) {
        playSound('correct');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `🏆 ${winnerName} had het goed: ${correctAnswer}`, type: 'success' } });
      }
      dispatch({ type: 'UPDATE_SNELSTEVINGER_STATE', patch: { winnerId: scores[0]?.playerId ?? null, winnerName, correctAnswer, scores, phase: 'reveal' } });
    });

    socket.on('snelstevinger:question-timeout', ({ correctAnswer, scores }) => {
      if (!isSpectatorRef.current) {
        playSound('wrong');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `⏱️ Tijd voorbij! Antwoord: ${correctAnswer}`, type: 'warning' } });
      }
      dispatch({ type: 'UPDATE_SNELSTEVINGER_STATE', patch: { winnerId: null, winnerName: null, correctAnswer, scores, phase: 'reveal' } });
    });

    socket.on('snelstevinger:game-end', ({ scores }) => {
      dispatch({ type: 'SNELSTEVINGER_GAME_END', state: { questionIndex: 0, totalQuestions: 0, question: '', category: '', timeRemainingMs: 0, totalTimeMs: 0, answered: false, buzzedWrong: false, winnerId: null, winnerName: null, correctAnswer: null, scores, phase: 'finished' as const } });
    });

    // ─── Tekenwedstrijd ─────────────────────────────────
    socket.on('drawing:settings-updated', (settings) => {
      dispatch({ type: 'DRAWING_SETTINGS_UPDATED', settings });
    });

    socket.on('drawing:state-update', (state) => {
      dispatch({ type: 'CLEAR_BRIEFING' });
      dispatch({ type: 'SET_DRAWING_STATE', state });
    });

    socket.on('drawing:game-end', ({ scores }) => {
      dispatch({ type: 'DRAWING_GAME_END', scores });
    });

    // ─── Muziek ─────────────────────────────────────────
    socket.on('muziek:settings-updated', (settings) => {
      dispatch({ type: 'MUZIEK_SETTINGS_UPDATED', settings });
    });

    socket.on('muziek:song', (state) => {
      dispatch({ type: 'CLEAR_BRIEFING' });
      dispatch({ type: 'SET_MUZIEK_STATE', state });
    });

    socket.on('muziek:buzz-result', ({ correct }) => {
      if (isSpectatorRef.current) return;
      playSound(correct ? 'correct' : 'wrong');
      if (!correct) {
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: '❌ Fout! Je kunt dit nummer niet meer raden.', type: 'error' } });
      }
    });

    socket.on('muziek:song-won', ({ winnerName, correctTitle, correctArtist, coverUrl, scores }) => {
      if (!isSpectatorRef.current) {
        playSound('correct');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `🏆 ${winnerName} raadde het!`, type: 'success' } });
      }
      dispatch({ type: 'UPDATE_MUZIEK_STATE', patch: { winnerId: scores[0]?.playerId ?? null, winnerName, correctTitle, correctArtist, coverUrl, scores, phase: 'reveal' } });
    });

    socket.on('muziek:song-timeout', ({ correctTitle, correctArtist, coverUrl, scores }) => {
      if (!isSpectatorRef.current) {
        playSound('wrong');
        dispatch({ type: 'ADD_TOAST', toast: { id: nextToastId(), message: `⏱️ Tijd voorbij! Het was: ${correctTitle}`, type: 'warning' } });
      }
      dispatch({ type: 'UPDATE_MUZIEK_STATE', patch: { winnerId: null, winnerName: null, correctTitle, correctArtist, coverUrl, scores, phase: 'reveal' } });
    });

    socket.on('muziek:game-end', ({ scores }) => {
      dispatch({ type: 'MUZIEK_GAME_END', scores });
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('settings-updated');
      socket.off('game-started');
      socket.off('countdown');
      socket.off('score-updated');
      socket.off('round-start');
      socket.off('group-result');
      socket.off('answer-result');
      socket.off('opendeur-result');
      socket.off('opendeur-next-question');
      socket.off('lingo-result');
      socket.off('lingo-next-word');
      socket.off('player-progress');
      socket.off('round-end');
      socket.off('game-end');
      socket.off('error');
      socket.off('time-update');
      socket.off('room-closed');
      socket.off('kicked');
      socket.off('dev-mode-status');
      socket.off('reconnected');
      socket.off('reconnect-failed');
      socket.off('whatami:settings-updated');
      socket.off('whatami:state-update');
      socket.off('whatami:guess-result');
      socket.off('whatami:player-guessed');
      socket.off('whatami:game-end');
      socket.off('hint-given');
      socket.off('snelstevinger:settings-updated');
      socket.off('snelstevinger:question');
      socket.off('snelstevinger:buzz-result');
      socket.off('snelstevinger:question-won');
      socket.off('snelstevinger:question-timeout');
      socket.off('snelstevinger:game-end');
      socket.off('drawing:settings-updated');
      socket.off('drawing:state-update');
      socket.off('drawing:game-end');
      socket.off('muziek:settings-updated');
      socket.off('muziek:song');
      socket.off('muziek:buzz-result');
      socket.off('muziek:song-won');
      socket.off('muziek:song-timeout');
      socket.off('muziek:game-end');
      socket.off('briefing-start');
      socket.off('briefing-ready-count');
    };
  }, [socket, dispatch]);
}
