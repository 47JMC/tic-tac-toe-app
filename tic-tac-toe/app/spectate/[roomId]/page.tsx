"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Socket } from "socket.io-client";
import { initSocket } from "@/lib/socket";

import { User, Spectator } from "@/lib/types";

import SpectatorsList from "@/app/components/SpectatorsList";
import PlayerCard from "@/app/components/PlayerCard";

export default function SpectateRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const decodedRoomId = decodeURIComponent(roomId);

  const [board, setBoard] = useState(Array(9).fill(""));
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [spectators, setSpectators] = useState<Spectator[]>([]);
  const [status, setStatus] = useState("Connecting...");
  const [players, setPlayers] = useState<{ X: User; O: User } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = initSocket();
    socketRef.current.connect();

    if (socketRef.current.connected) {
      socketRef.current.emit("spectate", { roomId: decodedRoomId });
    }

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("spectate", { roomId: decodedRoomId });
    });

    socketRef.current.on(
      "spectate-start",
      ({ board, currentTurn, players }) => {
        setBoard(board);
        setStatus(`${currentTurn}'s turn`);
        setPlayers(players);
      },
    );

    socketRef.current.on("move-made", ({ board, nextTurn }) => {
      setBoard(board);
      setStatus(`${nextTurn}'s turn`);
    });

    socketRef.current.on("game-over", ({ result, board }) => {
      setBoard(board);
      setStatus(result === "Draw" ? "It's a draw!" : `${result} wins!`);
    });

    socketRef.current.on("opponent-left", () => {
      setStatus("A player disconnected.");
    });

    socketRef.current.on(
      "spectator-count",
      ({ count, spectators }: { count: number; spectators: Spectator[] }) => {
        setSpectatorCount(count);
        setSpectators(spectators ?? []);
      },
    );

    socketRef.current.on("error", () => {
      setStatus("Room not found.");
    });

    return () => {
      socketRef.current?.emit("leave-spectate", { roomId: decodedRoomId });
      socketRef.current?.off();
    };
  }, [decodedRoomId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
      {/* Players */}
      {players && (
        <div className="flex items-center gap-4">
          <PlayerCard user={players.X} mark="X" />
          <p className="text-slate-400 font-fredoka text-lg">vs</p>
          <PlayerCard user={players.O} mark="O" />
        </div>
      )}

      <p className="text-lg text-yellow-400 font-medium">{status}</p>
      <SpectatorsList spectators={spectators} count={spectatorCount} />

      <div className="grid grid-cols-3 gap-3 bg-slate-900 p-4 rounded-2xl shadow-lg">
        {board.map((cell, index) => (
          <div
            key={index}
            className="h-20 w-20 flex items-center justify-center text-3xl font-fredoka rounded-xl border-2 border-slate-600 bg-slate-800"
          >
            <span
              className={
                cell === "X"
                  ? "text-blue-400"
                  : cell === "O"
                    ? "text-pink-400"
                    : ""
              }
            >
              {cell}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
