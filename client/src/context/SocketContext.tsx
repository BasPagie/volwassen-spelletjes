import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "shared/types";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SocketContext = createContext<GameSocket | null>(null);

const SESSION_KEY = "game-session";

export function saveSession(roomId: string, playerId: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, playerId }));
  } catch {}
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function getSession(): { roomId: string; playerId: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.roomId && parsed?.playerId) return parsed;
  } catch {}
  return null;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<GameSocket | null>(null);

  useEffect(() => {
    const s: GameSocket = io(
      window.location.hostname === "localhost"
        ? "http://localhost:3001"
        : window.location.origin,
      {
        transports: ["websocket", "polling"],
      },
    );

    s.on("connect", () => {
      console.log("[Socket] Verbonden:", s.id);

      // Attempt reconnection if we have a saved session
      const session = getSession();
      if (session) {
        console.log("[Socket] Herverbinden met sessie:", session.roomId);
        s.emit("reconnect-attempt", {
          roomId: session.roomId,
          playerId: session.playerId,
        });
      }
    });

    s.on("disconnect", () => {
      console.log("[Socket] Verbinding verbroken");
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): GameSocket | null {
  return useContext(SocketContext);
}
