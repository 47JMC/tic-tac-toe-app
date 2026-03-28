import { Server, Socket } from "socket.io";
import cookie from "cookie";
import { verifyToken } from "./routes/auth.js";

// Models
import User from "./models/User.js";

const DEV_MODE = process.env.DEV_MODE;

type Mark = "X" | "O";

type Game = {
  board: (Mark | "")[];
  turn: Mark;
  players: { X: string; O: string };
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

async function handleJoinGame(socket: Socket, io: Server) {
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
    };

    const xUser = await User.findOne({ id: waitingPlayer.data.user.id }).lean();
    const oUser = await User.findOne({ id: socket.data.user.id }).lean();

    const getWinRate = (u: any) => {
      const total = u.wins + u.losses + u.draws;
      return total === 0 ? 0 : Math.round((u.wins / total) * 100);
    };

    waitingPlayer.emit("start-game", {
      symbol: "X",
      opponent: { ...oUser, winRate: getWinRate(oUser) },
    });
    socket.emit("start-game", {
      symbol: "O",
      opponent: { ...xUser, winRate: getWinRate(xUser) },
    });

    waitingPlayer = null;
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

    if (!token) return null;

    const user = await verifyToken(token);

    if (!user) return next(new Error("Unauthorized"));

    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("join-game", async () => await handleJoinGame(socket, io));

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
        io.to(roomId).emit("game-over", { result, board: game.board });

        if (result === "Draw") {
          await User.updateOne({ id: game.players.X }, { $inc: { draws: 1 } });
          await User.updateOne({ id: game.players.O }, { $inc: { draws: 1 } });
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
        }

        delete games[roomId];
        return;
      }

      game.turn = game.turn === "X" ? "O" : "X";

      io.to(roomId).emit("move-made", {
        board: game.board,
        nextTurn: game.turn,
      });
    });

    socket.on("play-again", async () => await handleJoinGame(socket, io));

    socket.on("disconnect", () => {
      if (waitingPlayer?.id === socket.id) waitingPlayer = null;

      for (const roomId in games) {
        const game = games[roomId];
        if (game.players.X === socket.id || game.players.O === socket.id) {
          socket.to(roomId).emit("opponent-left");
          delete games[roomId];
        }
      }
    });
  });
}
