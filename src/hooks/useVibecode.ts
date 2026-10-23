import { useEffect, useState } from "react";
import { questions, tracks } from "../data/music";
import { discoverRealTracks } from "../services/musicDiscoveryService";
import {
  beginSpotifyAuthorization,
  createSpotifyPlaylist as createSpotifyPlaylistRequest,
  fetchSavedTracks,
  getStoredSpotifyTokens,
} from "../services/spotifyService";
import type { ChatMessage, Mode, Track } from "../types/vibecode";
import { getRecommendations, moodRelevance, normalise } from "../utils/music";

export function useVibecode() {
  const [mode, setMode] = useState<Mode>("home");
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [radioTracks, setRadioTracks] = useState<Track[]>(tracks.slice(0, 8));
  const [radioIndex, setRadioIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      from: "app",
      text: "Tell me the scene, the feeling, or a song you can't stop thinking about. I'll turn it into a music direction.",
    },
  ]);
  const [connected, setConnected] = useState(false);
  const [tasteProfile, setTasteProfile] = useState<string[]>([]);
  const [savedTrackKeys, setSavedTrackKeys] = useState<string[]>([]);
  const [tasteStatus, setTasteStatus] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
  const redirectUri =
    process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/callback";

  useEffect(() => {
    const saved = getStoredSpotifyTokens();
    if (saved) setConnected(true);
  }, []);

  const currentMood = answers.mood || "dreamy";
  const currentGenre = answers.genre || "any";
  const currentNovelty = answers.novelty || "balanced";

  async function connectSpotify() {
    if (!clientId) {
      setStatus("Add your Spotify Client ID to .env.local, then restart the dev server.");
      return;
    }
    await beginSpotifyAuthorization(clientId, redirectUri);
  }

  async function analyzeTaste() {
    setTasteStatus("Analyzing your saved music…");
    setTasteProfile([]);

    try {
      const saved = getStoredSpotifyTokens();
      if (!saved) throw new Error("Connect Spotify first.");

      const tokenData = JSON.parse(saved) as { access_token?: string };
      const accessToken = tokenData.access_token;
      if (!accessToken) throw new Error("No Spotify access token found. Reconnect Spotify.");

      const data = await fetchSavedTracks(accessToken);
      const libraryKeys: string[] = [];
      for (const item of data.items ?? []) {
        const track = item.track;
        if (track?.name) {
          libraryKeys.push(normalise(track.name));
          libraryKeys.push(
            normalise(`${track.name}${(track.artists ?? []).map((artist) => artist.name).join("")}`),
          );
        }
      }
      setSavedTrackKeys(libraryKeys);

      const artistCounts: Record<string, number> = {};
      for (const item of data.items ?? []) {
        for (const artist of item.track?.artists ?? []) {
          artistCounts[artist.name] = (artistCounts[artist.name] ?? 0) + 1;
        }
      }
      const topArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([artist]) => artist);

      setTasteProfile(topArtists);
      setTasteStatus(
        topArtists.length
          ? `Analyzed ${data.items?.length ?? 0} saved tracks. Your recurring artists are below.`
          : "No saved tracks found. Save some songs on Spotify and try again.",
      );
    } catch (error) {
      setTasteStatus(error instanceof Error ? error.message : "Couldn't analyze your music.");
    }
  }

  async function makePlaylist() {
    const saved = getStoredSpotifyTokens();
    if (!saved) {
      setStatus("Connect Spotify and analyze your saved tracks first.");
      setMode("home");
      return;
    }
    const tokenData = JSON.parse(saved) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      setStatus("Spotify session missing. Reconnect Spotify.");
      setMode("home");
      return;
    }

    setBusy(true);
    setStatus("Finding real music discoveries. This may take up to 40 seconds…");
    try {
      const discovered = await discoverRealTracks(
        tasteProfile,
        accessToken,
        savedTrackKeys,
        currentMood,
        currentGenre,
      );
      const ordered = [...discovered].sort((a, b) => {
        const aMood = moodRelevance(a, currentMood);
        const bMood = moodRelevance(b, currentMood);
        const aGenre =
          currentGenre === "any" || a.genre.toLowerCase().includes(currentGenre.toLowerCase()) ? 1 : 0;
        const bGenre =
          currentGenre === "any" || b.genre.toLowerCase().includes(currentGenre.toLowerCase()) ? 1 : 0;
        return bMood - aMood || bGenre - aGenre;
      });
      setPlaylist(ordered.slice(0, 15));
      setStatus(
        `Found ${Math.min(ordered.length, 15)} tracks. Ranking uses available catalogue tags and title/artist hints, not audio analysis; genre tags may be missing.`,
      );
      setMode("result");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn't find new tracks. Try again.");
      setMode("home");
    } finally {
      setBusy(false);
    }
  }

  function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((previous) => [...previous, { from: "user", text }]);
    const lower = text.toLowerCase();
    const mood = /sad|lonely|melanch|rain|blue|lost/.test(lower)
      ? "melancholic"
      : /love|romantic|crush|date/.test(lower)
        ? "romantic"
        : /energy|dance|party|hype|run/.test(lower)
          ? "energetic"
          : /focus|work|study|calm/.test(lower)
            ? "focus"
            : "dreamy";
    const result = getRecommendations(mood, "any", "adventurous", disliked).slice(0, 5);
    setChatMessages((previous) => [
      ...previous,
      {
        from: "app",
        text: `I'm reading that as ${mood}. Try ${result
          .slice(0, 3)
          .map((track) => track.title + " — " + track.artist)
          .join("; ")}. Want it more familiar, more adventurous, or a different mood?`,
      },
    ]);
    setChatInput("");
  }

  async function createSpotifyPlaylist() {
    const saved = getStoredSpotifyTokens();
    if (!saved) {
      await connectSpotify();
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const tokenData = JSON.parse(saved) as { access_token?: string };
      const accessToken = tokenData.access_token;
      if (!accessToken) throw new Error("Spotify session missing. Reconnect Spotify.");

      const result = await createSpotifyPlaylistRequest(accessToken, playlist, currentMood);
      setStatus(
        `Playlist created! ${result.trackCount} tracks added${
          result.missingCount ? `; ${result.missingCount} tracks couldn't be matched` : ""
        }.`,
      );
      if (result.externalUrl) window.open(result.externalUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function feedback(kind: "like" | "dislike", track: Track) {
    if (kind === "like") {
      setLiked((previous) => (previous.includes(track.id) ? previous : [...previous, track.id]));
    } else {
      setDisliked((previous) => (previous.includes(track.id) ? previous : [...previous, track.id]));
      setRadioTracks((previous) => [
        ...previous.filter((item) => item.id !== track.id),
        ...getRecommendations(currentMood, "any", "adventurous", [...disliked, track.id])
          .filter((item) => !previous.some((existing) => existing.id === item.id))
          .slice(0, 1),
      ]);
    }
  }

  const activeTrack = radioTracks[radioIndex % radioTracks.length] || tracks[0];

  return {
    mode,
    setMode,
    q,
    setQ,
    answers,
    setAnswers,
    playlist,
    setPlaylist,
    radioTracks,
    setRadioTracks,
    radioIndex,
    setRadioIndex,
    liked,
    disliked,
    chatInput,
    setChatInput,
    chatMessages,
    connected,
    tasteProfile,
    tasteStatus,
    status,
    busy,
    currentMood,
    currentGenre,
    currentNovelty,
    activeTrack,
    questions,
    handlers: {
      connectSpotify,
      analyzeTaste,
      makePlaylist,
      sendChat,
      createSpotifyPlaylist,
      feedback,
    },
  };
}
