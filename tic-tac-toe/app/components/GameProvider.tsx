"use client";

import { createContext, useContext, useState } from "react";

type Opponent = {
  id: string;
  username: string;
  avatar: string;
} | null;

type GameContextType = {
  opponent: Opponent;
  setOpponent: (opponent: Opponent) => void;
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [opponent, setOpponent] = useState<Opponent>(null);
  return (
    <GameContext.Provider value={{ opponent, setOpponent }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameContext must be used within GameProvider");
  return ctx;
}
