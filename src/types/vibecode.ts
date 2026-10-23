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
};

export type Mode = "home" | "quiz" | "result" | "radio" | "chat";

export type QuizQuestion = {
  title: string;
  key: string;
  options: [string, string][];
};

export type ChatMessage = {
  from: "user" | "app";
  text: string;
};
