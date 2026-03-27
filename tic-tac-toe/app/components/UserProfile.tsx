"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type UserData = {
  id: string;
  username: string;
  avatar: string;
};

function UserProfile() {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`,
          { credentials: "include" },
        );
        if (!res.ok) return setUserData(null);
        setUserData(await res.json());
      } catch {
        setUserData(null);
      }
    };
    fetchUserData();
  }, []);

  return (
    <div className="flex gap-2 bg-linear-to-r items-center from-sky-900 to-indigo-950 transition-colors rounded-lg p-1 m-1 border-2 border-purple-950 hover:border-blue-700">
      {userData ? (
        <>
          <div className="flex flex-col justify-center">
            <p className="font-fredoka text-xl">@{userData.username}</p>
            <button
              onClick={() =>
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
                  credentials: "include",
                })
              }
              className="hover:bg-red-500 transition-all p-1 rounded-lg"
            >
              Logout
            </button>
          </div>
          <Image
            src={`https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp?size=80`}
            alt={userData.username}
            width={80}
            height={80}
            className="rounded-full"
          />
        </>
      ) : (
        <button className="rounded-lg p-2 m-2 bg-green-500 hover:bg-green-700 transition-colors">
          <Link href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`}>
            Login
          </Link>
        </button>
      )}
    </div>
  );
}

export default UserProfile;
