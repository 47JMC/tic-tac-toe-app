import SpectateLobby from "../components/SpectateLobby";
import UserProfile from "../components/UserProfile";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-3 py-2">
        <div />
        <h1 className="text-lg sm:text-3xl font-bold tracking-wide whitespace-nowrap">
          Spectate
        </h1>
        <UserProfile />
      </nav>

      {/* Main content */}
      <div className="flex flex-col items-center flex-1 pt-6">
        <SpectateLobby />
      </div>
    </div>
  );
}
