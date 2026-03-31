export type Spectator = {
  id: string;
  username: string;
  avatar: string;
};

export type User = {
  id: string;
  username: string;
  avatar: string;
  winRate: number;
  wins: number;
  losses: number;
  draws: number;
};
