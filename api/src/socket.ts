import { Server, Socket } from "socket.io";
import cookie from "cookie";
import { verifyToken } from "./routes/auth.js";

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

function handleJoinGame(socket: Socket, io: Server) {
  if (waitingPlayer && waitingPlayer.id !== socket.id) {
    const roomId = `${waitingPlayer.id}#${socket.id}`;
    socket.join(roomId);
    waitingPlayer.join(roomId);

    games[roomId] = {
      board: Array(9).fill(""),
      turn: "X",
      players: { X: waitingPlayer.id, O: socket.id },
    };

    waitingPlayer.emit("start-game", {
      symbol: "X",
      opponent: socket.data.user,
    });
    socket.emit("start-game", {
      symbol: "O",
      opponent: waitingPlayer.data.user,
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

    socket.on("join-game", () => handleJoinGame(socket, io));

    socket.on("make-move", ({ index }: { index: number }) => {
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
        io.to(roomId).emit("game-over", { result: result, board: game.board });

        delete games[roomId];
        return;
      }

      game.turn = game.turn === "X" ? "O" : "X";

      io.to(roomId).emit("move-made", {
        board: game.board,
        nextTurn: game.turn,
      });
    });

    socket.on("play-again", () => handleJoinGame(socket, io));

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
