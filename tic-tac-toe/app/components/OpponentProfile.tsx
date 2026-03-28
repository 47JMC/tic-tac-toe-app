// OpponentProfile.tsx
"use client";

import { useGameContext } from "./GameProvider";
import Image from "next/image";

function OpponentProfile() {
  const { opponent } = useGameContext();

  if (!opponent)
    return (
      <div className="flex gap-2 bg-linear-to-r items-center from-orange-400 to-red-600 transition-colors rounded-lg p-1 m-1 border-2 border-purple-950">
        <p className="font-fredoka text-sm sm:text-xl text-white">Waiting...</p>
      </div>
    );

  return (
    <div
      title={`@${opponent.username}`}
      className="flex gap-2 bg-linear-to-r items-center from-orange-500 to-red-600 transition-colors rounded-lg p-1 m-1 border-2 border-purple-950 hover:border-blue-700"
    >
      <Image
        src={`https://cdn.discordapp.com/avatars/${opponent.id}/${opponent.avatar}.webp?size=80`}
        alt={opponent.username}
        width={48}
        height={48}
        className="rounded-full w-10 h-10 sm:w-16 sm:h-16"
      />
      <div className="hidden sm:flex flex-col justify-center">
        <p className="font-fredoka text-xl">@{opponent.username}</p>
        <p className="text-xs text-slate-300">
          {opponent.winRate === null
            ? "Play 10 games"
            : `Win rate: ${opponent.winRate}%`}
        </p>
      </div>
    </div>
  );
}

export default OpponentProfile;
