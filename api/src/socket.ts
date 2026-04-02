import { Server, Socket } from "socket.io";
import cookie from "cookie";
import { verifyToken } from "./routes/auth.js";

// Models
import User from "./models/User.js";

const DEV_MODE = process.env.DEV_MODE;

type Mark = "X" | "O";

type User = {
  id: string;
  username: string;
  avatar: string;
  wins: number;
  losses: number;
  draws: number;
};

type Game = {
  board: (Mark | "")[];
  turn: Mark;
  players: { X: string; O: string };
  timer: ReturnType<typeof setTimeout> | null;
  spectators: Map<string, User>;
};

const winningCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
const games: Record<string, Game> = {};
let waitingPlayer: Socket | null = null;
// ========================================

function startTimer(roomId: string, io: Server) {
  const game = games[roomId];
  if (!game) return;

  if (game.timer) clearTimeout(game.timer);

  game.timer = setTimeout(() => {
    if (!games[roomId]) return;
    game.turn = game.turn === "X" ? "O" : "X";
    io.to(roomId).emit("move-made", {
      board: game.board,
      nextTurn: game.turn,
    });
    startTimer(roomId, io); // restart for next player
  }, 15000);
}

function handleJoinGame(socket: Socket, io: Server) {
  if (
    waitingPlayer &&
    (waitingPlayer.data.user.id !== socket.data.user.id || DEV_MODE)
  ) {
    const roomId = `${waitingPlayer.id}#${socket.id}`;
    socket.join(roomId);
    waitingPlayer.join(roomId);

    games[roomId] = {
      board: Array(9).fill(""),
      turn: "X",
      players: { X: waitingPlayer.id, O: socket.id },
      timer: null,
      spectators: new Map(),
    };

    const getWinRate = (u: any) => {
      const total = u.wins + u.losses + u.draws;
      if (total < 10) return null;
      return Math.round((u.wins / total) * 100);
    };

    const xUser = waitingPlayer.data.user;
    const oUser = socket.data.user;

    waitingPlayer.emit("start-game", {
      symbol: "X",
      roomId,
      opponent: { ...oUser, winRate: getWinRate(oUser) },
    });

    socket.emit("start-game", {
      symbol: "O",
      roomId,
      opponent: {
        ...xUser,
        winRate: getWinRate(xUser),
      },
    });

    waitingPlayer = null;
    startTimer(roomId, io);
  } else {
    waitingPlayer = socket;
  }
}

function checkWinner(board: (Mark | "")[]): Mark | "Draw" | null {
  for (const [a, b, c] of winningCombos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Mark;
    }
  }

  if (board.every((cell) => cell !== "")) return "Draw";

  return null;
}

export function initSocket(io: Server) {
  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token;

    if (!token) return new Error("Unauthorized");

    const user = await verifyToken(token);

    if (!user) return next(new Error("Unauthorized"));

    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("join-game", async () => handleJoinGame(socket, io));

    socket.on("make-move", async ({ index }: { index: number }) => {
      if (typeof index !== "number" || index < 0 || index > 8) return;

      const roomId = Array.from(socket.rooms).find((r) => r !== socket.id);
      if (!roomId) return;

      const game = games[roomId];
      if (!game) return;

      const playerSymbol = socket.id === game.players.X ? "X" : "O";
      if (game.turn !== playerSymbol || game.board[index] !== "") return;

      game.board[index] = playerSymbol;

      const result = checkWinner(game.board);

      if (result) {
        if (game.timer) clearTimeout(game.timer);
        io.to(roomId).emit("game-over", { result, board: game.board });

        if (result === "Draw") {
          const xSocket = io.sockets.sockets.get(game.players.X);
          const oSocket = io.sockets.sockets.get(game.players.O);
          await User.updateOne(
            { id: xSocket?.data.user.id },
            { $inc: { draws: 1 } },
          );
          await User.updateOne(
            { id: oSocket?.data.user.id },
            { $inc: { draws: 1 } },
          );
          if (xSocket) xSocket.data.user.draws += 1;
          if (oSocket) oSocket.data.user.draws += 1;
        } else {
          const winnerId = result === "X" ? game.players.X : game.players.O;
          const loserId = result === "X" ? game.players.O : game.players.X;

          // get socket user ids from socket.data.user
          const winnerSocket = io.sockets.sockets.get(winnerId);
          const loserSocket = io.sockets.sockets.get(loserId);

          await User.updateOne(
            { id: winnerSocket?.data.user.id },
            { $inc: { wins: 1 } },
          );
          await User.updateOne(
            { id: loserSocket?.data.user.id },
            { $inc: { losses: 1 } },
          );

          if (winnerSocket) winnerSocket.data.user.wins += 1;
          if (loserSocket) loserSocket.data.user.losses += 1;
        }

        delete games[roomId];
        return;
      }

      game.turn = game.turn === "X" ? "O" : "X";

      io.to(roomId).emit("move-made", {
        board: game.board,
        nextTurn: game.turn,
      });

      startTimer(roomId, io);
    });

    socket.on("play-again", async () => handleJoinGame(socket, io));

    socket.on("leave-game", () => {
      const roomId = Array.from(socket.rooms).find((r) => r !== socket.id);
      if (roomId) {
        if (games[roomId]?.timer) clearTimeout(games[roomId].timer);
        socket.to(roomId).emit("opponent-left");
        socket.leave(roomId);
        delete games[roomId];
      }
    });

    socket.on("get-rooms", () => {
      const activeRooms = Object.entries(games).map(([roomId, game]) => ({
        roomId,
        spectators: game.spectators.size,
        game: game.board,
        turn: game.turn,
      }));

      socket.emit("rooms-list", activeRooms);
    });

    socket.on("spectate", ({ roomId }: { roomId: string }) => {
      const game = games[roomId];
      if (!game) return socket.emit("error", "Room not found");

      const userId = socket.data.user.id;

      // already spectating
      if (game.spectators.has(userId))
        return socket.emit("error", "Already spectating");

      // prevent spectating a game you're playing in
      const xSocket = io.sockets.sockets.get(game.players.X);
      const oSocket = io.sockets.sockets.get(game.players.O);
      if (
        !DEV_MODE &&
        (xSocket?.data.user.id === userId || oSocket?.data.user.id === userId)
      ) {
        return socket.emit("error", "You are a player in this game");
      }

      socket.join(roomId);
      game.spectators.set(userId, { ...socket.data.user });

      socket.emit("spectate-start", {
        board: game.board,
        currentTurn: game.turn,
        players: { X: xSocket?.data.user, O: oSocket?.data.user },
      });

      io.to(roomId).emit("spectator-count", {
        count: game.spectators.size,
        spectators: Array.from(game.spectators.values()),
      });
    });

    socket.on("leave-spectate", ({ roomId }: { roomId: string }) => {
      const game = games[roomId];
      if (game) {
        game.spectators.delete(socket.data.user.id);
        io.to(roomId).emit("spectator-count", {
          count: game.spectators.size,
          spectators: Array.from(game.spectators.values()),
        });
      }
      socket.leave(roomId);
    });

    socket.on("disconnect", () => {
      if (waitingPlayer?.id === socket.id) waitingPlayer = null;

      for (const roomId in games) {
        const game = games[roomId];

        if (game.spectators.has(socket.data.user.id)) {
          game.spectators.delete(socket.data.user.id);
          io.to(roomId).emit("spectator-count", {
            count: game.spectators.size,
            spectators: Array.from(game.spectators.values()),
          });
          continue;
        }

        if (game.players.X === socket.id || game.players.O === socket.id) {
          if (game.timer) clearTimeout(game.timer);
          socket.to(roomId).emit("opponent-left");
          delete games[roomId];
        }
      }
    });

    socket.on("chat-message", ({ message }: { message: string }) => {
      if (!socket.data.user.premium)
        return socket.emit("error", "Premium only");
      if (!message.trim() || message.length > 200) return;

      const roomId = Array.from(socket.rooms).find((r) => r !== socket.id);
      if (!roomId || !games[roomId]) return;

      io.to(roomId).emit("chat-message", {
        user: socket.data.user,
        message: message.trim(),
      });
    });
  });
}
