import type { Track } from "../types/vibecode";
import { tracks } from "../data/music";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const normalise = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

// Lightweight mood hints only; title/artist text cannot reliably determine a song’s actual mood.
export function moodRelevance(track: Track, mood: string): number {
  const text = `${track.title} ${track.artist}`.toLowerCase();
  const hints: Record<string, string[]> = {
    romantic: ["love", "lover", "lovers", "kiss", "heart", "desire", "adore", "romance", "mine all mine", "marry me", "sunsetz", "kasoor", "iktara", "jashn-e-bahaaraa", "tadow", "aaj jaane ki zid na karo"],
    melancholic: ["sad", "tears", "cry", "lonely", "lost", "goodbye", "night we met", "space song", "kasoor", "show me how"],
    dreamy: ["dream", "moon", "space", "slow", "sunsetz", "show me how", "space song", "a walk"],
    nostalgic: ["memory", "remember", "again", "yesterday", "night we met", "iktara", "jashn-e-bahaaraa"],
    hopeful: ["sun", "light", "alive", "hope", "sweet disposition", "sun models"],
    focus: ["instrumental", "ambient", "walk", "odyssey", "kerala", "glue"],
    "late night": ["night", "2 am", "midnight", "sunsetz", "space song", "night we met", "aaj jaane ki zid na karo"],
    energetic: ["energy", "dance", "move", "alive", "katchi sera", "glue", "sweet disposition"],
  };
  return (hints[mood] ?? []).some((hint) => text.includes(hint)) ? 2 : 0;
}

export function getRecommendations(
  mood: string,
  genre: string,
  novelty: string,
  disliked: string[] = [],
  preferredArtists: string[] = [],
): Track[] {
  const available = tracks.filter((track) => !disliked.includes(track.id));

  const familiar = available.filter((track) =>
    preferredArtists.some((artist) => artist.toLowerCase() === track.artist.toLowerCase()),
  );

  const unfamiliar = available.filter(
    (track) =>
      !preferredArtists.some((artist) => artist.toLowerCase() === track.artist.toLowerCase()),
  );

  function score(track: Track) {
    const moodScore = track.mood.includes(mood) ? 4 : 0;
    const genreScore =
      genre === "any" || track.genre.toLowerCase().includes(genre.toLowerCase()) ? 3 : 0;
    const noveltyScore =
      novelty === "adventurous" && !track.known
        ? 2
        : novelty === "familiar" && track.known
          ? 2
          : 1;

    return moodScore + genreScore + noveltyScore;
  }

  const sortByScore = (list: Track[]) =>
    [...list].sort((a, b) => score(b) - score(a));

  const familiarCount = novelty === "adventurous" ? 6 : novelty === "familiar" ? 12 : 9;
  const familiarSongs = sortByScore(familiar).slice(0, familiarCount);
  const unfamiliarSongs = sortByScore(unfamiliar).slice(0, 15 - familiarSongs.length);
  const selected = [...familiarSongs, ...unfamiliarSongs];

  return selected.sort((a, b) => score(b) - score(a)).slice(0, 15);
}
