"use client";

import Image from "next/image";
import { User } from "@/lib/types";

type Props = {
  user: User;
  mark: "X" | "O";
};

export default function PlayerCard({ user, mark }: Props) {
  return (
    <div
      className={`flex items-center gap-2 bg-linear-to-r rounded-lg p-1 m-1 border-2 border-purple-950
      ${mark === "X" ? "from-sky-900 to-indigo-950" : "from-orange-500 to-red-600"}`}
    >
      <Image
        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=48`}
        alt={user.username}
        width={40}
        height={40}
        className="rounded-full"
      />
      <div className="hidden sm:flex flex-col">
        <p className="font-fredoka text-sm">@{user.username}</p>
        <p
          className={`text-xs ${mark === "X" ? "text-blue-400" : "text-pink-400"}`}
        >
          {mark}
        </p>
      </div>
    </div>
  );
}
