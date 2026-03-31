// components/SpectatorList.tsx
"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import Image from "next/image";

import { Spectator } from "@/lib/types";

type Props = {
  spectators: Spectator[];
  count: number;
};

export default function SpectatorsList({ spectators, count }: Props) {
  const [open, setOpen] = useState(false);

  if (spectators.length === 0) return null;

  return (
    <>
      <p
        className="text-xs text-slate-400 mb-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        👁 {count} watching {open ? "▲" : "▼"}
      </p>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-indigo-950 rounded-lg border border-blue-600 mb-4"
          >
            {spectators.map((spectator) => (
              <div className="flex p-1 m-1 gap-2" key={spectator.id}>
                <Image
                  src={`https://cdn.discordapp.com/avatars/${spectator.id}/${spectator.avatar}?size=24`}
                  alt={spectator.username}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="text-sm">{spectator.username}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
