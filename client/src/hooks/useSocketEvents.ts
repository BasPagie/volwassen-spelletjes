import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { saveSession, clearSession } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export function useSocketEvents() {
  const socket = useSocket();
  const { dispatch } = useGame();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

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
    });

    socket.on('player-left', ({ playerId, newHostId, disconnected }) => {
      dispatch({ type: 'PLAYER_LEFT', playerId, newHostId, disconnected });
    });

    socket.on('settings-updated', (settings) => {
      dispatch({ type: 'SETTINGS_UPDATED', settings });
    });

    socket.on('game-started', () => {
      dispatch({ type: 'GAME_STARTED' });
    });

    socket.on('countdown', ({ count }) => {
      dispatch({ type: 'COUNTDOWN', count });
    });

    socket.on('score-updated', ({ playerId, score }) => {
      dispatch({ type: 'SCORE_UPDATED', playerId, score });
    });

    socket.on('round-start', ({ roundState, roundIndex }) => {
      dispatch({ type: 'ROUND_START', roundState, roundIndex });
    });

    socket.on('group-result', ({ roundState, hintWords }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState, hintWords });
    });

    socket.on('answer-result', ({ correct, roundState }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState, answerResult: { correct } });
    });

    socket.on('opendeur-result', ({ correct, matchedAnswer, roundState, questionComplete }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
    });

    socket.on('opendeur-next-question', ({ roundState, previousAnswers }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
    });

    socket.on('lingo-result', ({ correct, feedback, roundState }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
    });

    socket.on('lingo-next-word', ({ roundState, previousWord }) => {
      dispatch({ type: 'UPDATE_ROUND_STATE', roundState });
    });

    socket.on('player-progress', (progress) => {
      dispatch({ type: 'PLAYER_PROGRESS', progress });
    });

    socket.on('round-end', (result) => {
      dispatch({ type: 'ROUND_END', result });
    });

    socket.on('game-end', (results) => {
      dispatch({ type: 'GAME_END', results });
    });

    socket.on('error', ({ message }) => {
      console.error('[Game Error]', message);
      dispatch({ type: 'SET_ERROR', message });
      setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 5000);
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
    };
  }, [socket, dispatch]);
}
