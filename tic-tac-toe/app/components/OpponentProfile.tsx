"use client";

import { useGameContext } from "./GameProvider";
import Image from "next/image";

function OpponentProfile() {
  const { opponent } = useGameContext();

  if (!opponent)
    return (
      <div className="flex gap-2 bg-linear-to-r items-center from-orange-400 to-red-600 transition-colors rounded-lg p-1 m-1 border-2 border-purple-950">
        <p className="font-fredoka text-xl text-white">Waiting...</p>
      </div>
    );

  return (
    <div className="flex gap-2 bg-linear-to-r items-center from-orange-500 to-red-600 transition-colors rounded-lg p-1 m-1 border-2 border-purple-950 hover:border-blue-700">
      <Image
        src={`https://cdn.discordapp.com/avatars/${opponent.id}/${opponent.avatar}.webp?size=80`}
        alt={opponent.username}
        width={80}
        height={80}
        className="rounded-full"
      />
      <p className="font-fredoka text-xl">@{opponent.username}</p>
      <p className="text-xs text-white">Win rate: {opponent.winRate}%</p>
    </div>
  );
}

export default OpponentProfile;
