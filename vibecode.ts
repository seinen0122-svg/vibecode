export type Track = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  mood: string[];
  energy: number;
  known?: boolean;
  color: string;
  spotifyUri?: string;
  /** Best-effort origin classification; unknown is preferable to guessing. */
  originRegion?: "indian" | "international" | "unknown";
};

export type Mode = "home" | "quiz" | "result" | "radio";
export type MusicScope = "auto" | "mixed" | "indian" | "international";

export type QuizQuestion = {
  title: string;
  key: string;
  options: [string, string][];
};

export type ListeningHistoryTrack = {
  name?: string;
  artists?: { name: string }[];
  played_at?: string;
};