import Game from "./components/Game";
import UserProfile from "./components/UserProfile";
import OpponentProfile from "./components/OpponentProfile";
import { GameProvider } from "./components/GameProvider";

function Page() {
  return (
    <GameProvider>
      <div className="min-h-screen flex flex-col bg-slate-950 text-white">
        <nav className="flex items-center justify-between px-6 py-4">
          <OpponentProfile />
          <h1 className="text-3xl font-bold tracking-wide">Tic Tac Toe</h1>
          <UserProfile />
        </nav>
        <div className="flex flex-col items-center justify-center flex-1">
          <Game />
        </div>
      </div>
    </GameProvider>
  );
}

export default Page;
