"use client";

import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import Image from "next/image";
import { User } from "@/lib/types";

type Message = {
  user: User;
  message: string;
};

type Props = {
  socketRef: React.RefObject<Socket | null>;
};

export default function PremiumChat({ socketRef }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`,
          { credentials: "include" },
        );

        if (!res.ok) {
          return setIsPremium(false);
        }

        const data = await res.json();
        setIsPremium(data.premium);
      } catch {
        setIsPremium(false);
      }
    };

    fetchPremiumStatus();
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    socket?.on("chat-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket?.off("chat-message");
    };
  }, [socketRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socketRef.current?.emit("chat-message", { message: input });
    setInput("");
  };

  return (
    <div className="flex flex-col w-72 bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Messages */}
      <div className="flex flex-col gap-2 p-3 h-48 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center mt-auto">
            No messages yet
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-2">
            <Image
              src={`https://cdn.discordapp.com/avatars/${msg.user.id}/${msg.user.avatar}.webp?size=32`}
              alt={msg.user.username}
              width={24}
              height={24}
              className="rounded-full mt-0.5"
            />
            <div>
              <p className="text-xs text-slate-400 font-fredoka">
                @{msg.user.username}
              </p>
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-2">
        {isPremium ? (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-slate-800 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="px-3 py-1 bg-blue-600 rounded-lg hover:bg-blue-800 transition-all text-sm"
            >
              Send
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center">🔒 Premium only</p>
        )}
      </div>
    </div>
  );
}
