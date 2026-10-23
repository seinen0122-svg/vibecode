import type { Track } from "../types/vibecode";

type SpotifyArtist = { name: string };
type SpotifySavedTrack = {
  name?: string;
  artists?: SpotifyArtist[];
};
type SpotifySavedTrackItem = { track?: SpotifySavedTrack | null };
type SpotifySavedTracksResponse = {
  items?: SpotifySavedTrackItem[];
};
type SpotifySearchTrack = {
  uri?: string;
};
type SpotifyPlaylistResponse = {
  id: string;
  external_urls?: { spotify?: string };
};

export function getStoredSpotifyTokens(): string | null {
  return localStorage.getItem("vibecode_tokens");
}

export async function beginSpotifyAuthorization(clientId: string, redirectUri: string): Promise<void> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = Array.from(verifierBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  sessionStorage.setItem("vibecode_verifier", verifier);
  sessionStorage.setItem("vibecode_state", state);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: "playlist-modify-private user-library-read playlist-read-private",
  });
  window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
}

export async function fetchSavedTracks(accessToken: string): Promise<SpotifySavedTracksResponse> {
  const response = await fetch("https://api.spotify.com/v1/me/tracks?limit=50", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Spotify API error:", response.status, errorBody);
    throw new Error(`Spotify request failed (${response.status}): ${errorBody || "No details returned"}`);
  }

  return response.json() as Promise<SpotifySavedTracksResponse>;
}

export async function createSpotifyPlaylist(
  accessToken: string,
  playlist: Track[],
  currentMood: string,
): Promise<{ trackCount: number; missingCount: number; externalUrl?: string }> {
  const searchResults = await Promise.all(
    playlist.map(async (track): Promise<string | undefined | null> => {
      if (track.spotifyUri) return track.spotifyUri;
      const query = encodeURIComponent(`track:${track.title} artist:${track.artist}`);
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as { tracks?: { items?: SpotifySearchTrack[] } };
      return data.tracks?.items?.[0]?.uri;
    }),
  );
  const uris = searchResults.filter((uri): uri is string => !!uri);

  const createdResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "vibecode — " + (currentMood === "late night" ? "2 AM thoughts" : currentMood + " mix"),
      description: "Made for your mood with vibecode.",
      public: false,
    }),
  });
  if (!createdResponse.ok) {
    throw new Error(`Could not create playlist (${createdResponse.status}). Check Spotify API access and your login.`);
  }

  const created = (await createdResponse.json()) as SpotifyPlaylistResponse;
  for (let index = 0; index < uris.length; index += 100) {
    const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${created.id}/items`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: uris.slice(index, index + 100) }),
    });
    if (!addResponse.ok) {
      throw new Error(`Playlist created, but adding tracks failed (${addResponse.status}).`);
    }
  }

  return {
    trackCount: uris.length,
    missingCount: playlist.length - uris.length,
    externalUrl: created.external_urls?.spotify,
  };
}
