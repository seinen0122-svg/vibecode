import { useEffect, useState } from "react";
import { questions, tracks } from "../data/music";
import { discoverRealTracks } from "../services/musicDiscoveryService";
import {
  beginSpotifyAuthorization,
  createSpotifyPlaylist as createSpotifyPlaylistRequest,
  fetchSavedTracks,
  fetchRecentlyPlayedTracks,
  getStoredSpotifyTokens,
  getValidSpotifyAccessToken,
} from "../services/spotifyService";
import type { Mode, MusicScope, Track } from "../types/vibecode";
import { getRecommendations, normalise } from "../utils/music";

export function useVibecode() {
  const [mode, setMode] = useState<Mode>("home");
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [radioTracks, setRadioTracks] = useState<Track[]>(tracks.slice(0, 8));
  const [radioIndex, setRadioIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
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

    // Restore track-level feedback so future mixes learn from previous sessions.
    try {
      const rawFeedback = window.localStorage.getItem("vibecode_feedback_v1");
      if (rawFeedback) {
        const parsed = JSON.parse(rawFeedback) as { liked?: unknown; disliked?: unknown };
        if (Array.isArray(parsed.liked)) setLiked(parsed.liked.filter((id): id is string => typeof id === "string"));
        if (Array.isArray(parsed.disliked)) setDisliked(parsed.disliked.filter((id): id is string => typeof id === "string"));
      }
    } catch (error) {
      console.warn("Could not restore Vibecode feedback", error);
    } finally {
      setFeedbackLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!feedbackLoaded) return;
    try {
      window.localStorage.setItem("vibecode_feedback_v1", JSON.stringify({ liked, disliked }));
    } catch (error) {
      console.warn("Could not persist Vibecode feedback", error);
    }
  }, [feedbackLoaded, liked, disliked]);

  const currentMood = answers.mood || "dreamy";
  const currentGenre = answers.genre || "any";
  const currentNovelty = answers.novelty || "balanced";
  const currentMusicScope = (answers.musicScope || "auto") as MusicScope;

  async function connectSpotify() {
    if (!clientId) {
      setStatus("Add your Spotify Client ID to .env.local, then restart the dev server.");
      return;
    }
    await beginSpotifyAuthorization(clientId, redirectUri);
  }

  async function analyzeTaste() {
    setTasteStatus("Analyzing your saved tracks and recent listening history…");
    setTasteProfile([]);

    try {
      if (!getStoredSpotifyTokens()) throw new Error("Connect Spotify first.");

      const savedData = await fetchSavedTracks();
      let recentData: { items?: { track?: { name?: string; artists?: { name: string }[] } | null; played_at?: string }[] } = { items: [] };
      let recentHistoryUnavailable = false;
      try {
        recentData = await fetchRecentlyPlayedTracks();
      } catch (error) {
        recentHistoryUnavailable = true;
        console.warn("Recently played history unavailable; using saved tracks for now.", error);
      }

      const savedItems = savedData.items ?? [];
      const recentItems = recentData.items ?? [];
      const allLibraryKeys = new Set<string>();
      const artistCounts: Record<string, number> = {};

      function addTrack(track: { name?: string; artists?: { name: string }[] } | null | undefined, weight: number) {
        if (!track?.name) return;
        const titleKey = normalise(track.name);
        if (titleKey) allLibraryKeys.add(titleKey);
        const artistNames = (track.artists ?? []).map((artist) => artist.name).filter(Boolean);
        const combinedKey = normalise(`${track.name}${artistNames.join("")}`);
        if (combinedKey) allLibraryKeys.add(combinedKey);
        for (const artist of artistNames) {
          artistCounts[artist] = (artistCounts[artist] ?? 0) + weight;
        }
      }

      for (const item of savedItems) addTrack(item.track, 1);
      // Recent listening is weighted more strongly than the saved library because it
      // provides a better signal of the user's current musical world.
      for (const item of recentItems) addTrack(item.track, 2);

      const topArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([artist]) => artist);

      setSavedTrackKeys([...allLibraryKeys]);
      setTasteProfile(topArtists);
      if (!topArtists.length) {
        setTasteStatus("No saved or recently played tracks were found. Listen to or save some songs on Spotify, then try again.");
      } else {
        const recentNote = recentHistoryUnavailable
          ? " Recent listening permission is not active yet, so I used your saved tracks only. Reconnect Spotify to grant it."
          : ` Included ${recentItems.length} recently played tracks.`;
        setTasteStatus(
          `Analyzed ${savedItems.length} saved tracks and ${recentItems.length} recent plays. Recent plays count more strongly when ranking artists.${recentNote}`,
        );
      }
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
    let accessToken: string;
    try {
      accessToken = await getValidSpotifyAccessToken();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Spotify session missing. Reconnect Spotify.");
      setMode("home");
      return;
    }

    setBusy(true);
    setStatus("Finding real music discoveries. Catalogue searches may take about a minute…");
    try {
      const finalTracks = await discoverRealTracks(
        tasteProfile,
        accessToken,
        savedTrackKeys,
        currentMood,
        currentGenre,
        currentMusicScope,
        liked,
        disliked,
        [answers.intent, answers.setting].filter((value): value is string => Boolean(value)),
        currentNovelty,
      );
      setPlaylist(finalTracks);
      const indianCount = finalTracks.filter((track) => track.originRegion === "indian").length;
      const internationalCount = finalTracks.filter((track) => track.originRegion === "international").length;
      const scopeNote = currentMusicScope === "auto"
        ? "Auto mode used your saved and recently played artists as the main discovery seeds."
        : currentMusicScope === "mixed"
          ? `Regional evidence: ${indianCount} Indian, ${internationalCount} international, ${finalTracks.length - indianCount - internationalCount} unclassified.`
          : `Requested music scope: ${currentMusicScope}.`;
      const lengthNote = finalTracks.length < 15
        ? ` Only ${finalTracks.length} tracks passed the genre, mood-evidence and diversity checks; broaden the genre or change novelty to discover more.`
        : " Genre constraints and hard artist/scene diversity caps were applied.";
      setStatus(
        `Found ${finalTracks.length} tracks. ${scopeNote}${lengthNote} Mood matching uses available catalogue tags and limited title/artist hints, not direct audio analysis.`,
      );
      setMode("result");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn't find new tracks. Try again.");
      setMode("home");
    } finally {
      setBusy(false);
    }
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
      const accessToken = await getValidSpotifyAccessToken();
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
      createSpotifyPlaylist,
      feedback,
    },
  };
}
