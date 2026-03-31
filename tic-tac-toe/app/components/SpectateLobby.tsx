"use client";

import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { initSocket } from "@/lib/socket";
import * as motion from "motion/react-client";

type Room = {
  roomId: string;
  spectators: number;
  turn: "X" | "O";
};

export default function SpectateLobby() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomInput, setRoomInput] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  useEffect(() => {
    socketRef.current = initSocket();
    socketRef.current.connect();

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("get-rooms");
    });

    socketRef.current.on("rooms-list", (rooms: Room[]) => {
      setRooms(rooms);
    });

    return () => {
      socketRef.current?.off();
    };
  }, []);

  const spectate = (roomId: string) => {
    if (!roomId) return;
    router.push(`/spectate/${encodeURIComponent(roomId)}`);
  };

  return (
    <div className="flex flex-col items-center pt-10 w-full">
      <h1 className="text-3xl font-bold mb-6">Live Games</h1>

      {/* Join by room ID */}
      <div className="flex gap-2 mb-8">
        <input
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value)}
          placeholder="Enter room ID..."
          className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => spectate(roomInput)}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition-all"
        >
          Spectate
        </button>
      </div>

      {/* Active games list */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        {rooms.length === 0 ? (
          <p className="text-slate-400 text-center">
            No active games right now.
          </p>
        ) : (
          rooms.map((room, i) => (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1, ease: "easeOut" }}
              key={room.roomId}
              onClick={() => spectate(room.roomId)}
              className="flex items-center justify-between bg-slate-800 px-4 py-3 rounded-xl border border-slate-600 hover:border-blue-500 cursor-pointer transition-all"
            >
              <div>
                <p className="font-fredoka text-lg">Room</p>
                <p className="text-xs text-slate-400">{room.roomId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-yellow-400">{room.turn}s turn</p>
                <p className="text-xs text-slate-400">
                  👁 {room.spectators} watching
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
