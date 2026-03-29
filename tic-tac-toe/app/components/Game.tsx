"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useGameContext } from "./GameProvider";

export default function Game() {
  const [status, setStatus] = useState("Connecting to server...");
  const [board, setBoard] = useState(Array(9).fill(""));
  const [currentTurn, setCurrentTurn] = useState<"X" | "O">("X");
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O" | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  const playerSymbolRef = useRef<"X" | "O" | null>(null);
  const currentTurnRef = useRef<"X" | "O">("X");
  const winnerRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { setOpponent } = useGameContext();

  const setCurrentTurnWithRef = (turn: "X" | "O") => {
    currentTurnRef.current = turn;
    setCurrentTurn(turn);
  };

  const setWinnerWithRef = (w: string | null) => {
    winnerRef.current = w;
    setWinner(w);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClick = (index: number) => {
    if (!socketRef.current) return;
    if (winnerRef.current) return;
    if (playerSymbolRef.current !== currentTurnRef.current) return;
    socketRef.current.emit("make-move", { index });
  };

  const findGame = () => {
    setSearching(true);
    setStatus("Searching for players...");
    socketRef.current?.emit("join-game");
  };

  const findNewOpponent = () => {
    socketRef.current?.emit("leave-game");
    setWinnerWithRef(null);
    setBoard(Array(9).fill(""));
    setOpponent(null);
    setPlayerSymbol(null);
    playerSymbolRef.current = null;
    findGame();
  };

  const playAgain = () => {
    setWinnerWithRef(null);
    setBoard(Array(9).fill(""));
    setSearching(true);
    setStatus("Searching for players...");
    socketRef.current?.emit("play-again");
  };

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_API_BASE_URL!, {
      withCredentials: true,
    });

    socketRef.current.on("connect", () => {
      setStatus("Connected.");
    });

    socketRef.current.on(
      "start-game",
      ({
        symbol,
        opponent,
      }: {
        symbol: "X" | "O";
        opponent: {
          id: string;
          username: string;
          avatar: string;
          winRate: number;
        };
      }) => {
        setBoard(Array(9).fill(""));
        setWinnerWithRef(null);
        setCurrentTurnWithRef("X");
        setPlayerSymbol(symbol);
        playerSymbolRef.current = symbol;
        setOpponent(opponent);
        setSearching(false);
        setStatus(symbol === "X" ? "Your turn" : "Opponent's turn");
        resetTimer();
      },
    );

    socketRef.current.on(
      "move-made",
      ({ board, nextTurn }: { board: string[]; nextTurn: "X" | "O" }) => {
        if (winnerRef.current) return;

        setBoard(board);
        setCurrentTurnWithRef(nextTurn);
        setStatus(
          nextTurn === playerSymbolRef.current
            ? "Your turn"
            : "Opponent's turn",
        );
        resetTimer();
      },
    );

    socketRef.current.on("game-over", ({ result, board }) => {
      setBoard(board);
      setWinnerWithRef(result);
      if (result === "Draw") setStatus("It's a draw!");
      else if (result === playerSymbolRef.current) setStatus("You win! 🎉");
      else setStatus("You lose 😢");
      clearInterval(timerRef.current!);
    });

    socketRef.current.on("opponent-left", () => {
      setStatus("Opponent disconnected.");
      setWinnerWithRef("opponent-left");
      setOpponent(null);
      clearInterval(timerRef.current!);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [setOpponent]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-lg mb-2 text-yellow-400 font-medium">{status}</p>
      {playerSymbol && !winner && (
        <p
          className={`text-sm font-fredoka mb-2 ${timeLeft <= 5 ? "text-red-400" : "text-slate-400"}`}
        >
          {timeLeft}s
        </p>
      )}

      {!playerSymbol && !searching && (
        <button
          onClick={findGame}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition-all font-medium"
        >
          Find Game
        </button>
      )}

      {searching && (
        <p className="text-slate-400 font-medium animate-pulse">
          Waiting for opponent...
        </p>
      )}

      {playerSymbol && (
        <>
          <p className="text-sm mb-4 text-slate-400">
            You are: <span className="font-semibold">{playerSymbol}</span>
          </p>

          <div className="grid grid-cols-3 gap-3 bg-slate-900 p-4 rounded-2xl shadow-lg">
            {board.map((cell, index) => (
              <div
                key={index}
                onClick={() => handleClick(index)}
                className={`h-20 w-20 flex items-center justify-center text-3xl font-fredoka rounded-xl border-2 border-slate-600 bg-slate-800 transition-all duration-200
                  ${playerSymbol === currentTurn && !winner ? "cursor-pointer hover:bg-slate-700 hover:border-blue-600" : "opacity-50 cursor-not-allowed"}`}
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

          <div className="mt-6">
            {winner ? (
              <button
                onClick={
                  winner === "opponent-left" ? findNewOpponent : playAgain
                }
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition-all font-medium"
              >
                Play Again
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
