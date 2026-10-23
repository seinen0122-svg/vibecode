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
type SpotifyRecentTrackItem = {
  track?: SpotifySavedTrack | null;
  played_at?: string;
};
export type SpotifyRecentlyPlayedResponse = {
  items?: SpotifyRecentTrackItem[];
};
type SpotifySearchTrack = {
  uri?: string;
};
type SpotifyPlaylistResponse = {
  id: string;
  external_urls?: { spotify?: string };
};

type StoredSpotifyTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

type SpotifyTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

const TOKEN_STORAGE_KEY = "vibecode_tokens";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const EXPIRY_BUFFER_MS = 60_000;

export function getStoredSpotifyTokens(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function saveStoredSpotifyTokens(tokens: StoredSpotifyTokens): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function reconnectError(): Error {
  return new Error("Your Spotify session has expired. Click the headphones icon to reconnect Spotify.");
}

/** Return a usable token, refreshing it proactively when it is expired or near expiry. */
export async function getValidSpotifyAccessToken(forceRefresh = false): Promise<string> {
  const rawTokens = getStoredSpotifyTokens();
  if (!rawTokens) throw new Error("Connect Spotify first.");

  let tokens: StoredSpotifyTokens;
  try {
    tokens = JSON.parse(rawTokens) as StoredSpotifyTokens;
  } catch {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    throw reconnectError();
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
  const hasUsableAccessToken = Boolean(tokens.access_token);
  const expiresAt = typeof tokens.expires_at === "number" ? tokens.expires_at : 0;
  const tokenNotNearExpiry = expiresAt > Date.now() + EXPIRY_BUFFER_MS;

  if (!forceRefresh && hasUsableAccessToken && (tokenNotNearExpiry || !tokens.refresh_token && !expiresAt)) {
    return tokens.access_token as string;
  }

  if (!tokens.refresh_token || !clientId) {
    if (!forceRefresh && hasUsableAccessToken && (!expiresAt || expiresAt > Date.now())) {
      // Legacy token records without a refresh token can be used until Spotify rejects them.
      return tokens.access_token as string;
    }
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (!clientId) throw new Error("Missing Spotify Client ID. Check .env.local and restart the dev server.");
    throw reconnectError();
  }

  const refreshResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: clientId,
    }),
  });

  const refreshed = (await refreshResponse.json().catch(() => ({}))) as SpotifyTokenResponse;
  if (!refreshResponse.ok || !refreshed.access_token) {
    if (refreshed.error === "invalid_grant") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw reconnectError();
    }
    throw new Error(
      `Spotify token refresh failed: ${refreshed.error_description || refreshed.error || `HTTP ${refreshResponse.status}`}. Try reconnecting Spotify.`,
    );
  }

  const updatedTokens: StoredSpotifyTokens = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
  };
  saveStoredSpotifyTokens(updatedTokens);
  return updatedTokens.access_token as string;
}

/** Fetch a Spotify API resource, refreshing the token if needed and retrying a 401 once. */
async function spotifyApiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let accessToken = await getValidSpotifyAccessToken();
  const makeRequest = (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let response = await makeRequest(accessToken);
  if (response.status === 401) {
    accessToken = await getValidSpotifyAccessToken(true);
    response = await makeRequest(accessToken);
  }
  return response;
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
    scope: "playlist-modify-private user-library-read playlist-read-private user-read-recently-played",
  });
  window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
}

export async function fetchSavedTracks(_accessToken?: string): Promise<SpotifySavedTracksResponse> {
  const response = await spotifyApiFetch(`${API_BASE}/me/tracks?limit=50`);
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Spotify API error:", response.status, errorBody);
    if (response.status === 401) throw reconnectError();
    throw new Error(`Spotify request failed (${response.status}): ${errorBody || "No details returned"}`);
  }
  return response.json() as Promise<SpotifySavedTracksResponse>;
}

/** Fetch recent listening activity. Requires user-read-recently-played and a fresh OAuth grant. */
export async function fetchRecentlyPlayedTracks(): Promise<SpotifyRecentlyPlayedResponse> {
  const response = await spotifyApiFetch(`${API_BASE}/me/player/recently-played?limit=50`);
  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) throw reconnectError();
    if (response.status === 403) {
      throw new Error("Spotify has not granted recently played access yet. Reconnect Spotify and approve the new permission.");
    }
    throw new Error(`Recently played request failed (${response.status}): ${errorBody || "No details returned"}`);
  }
  return response.json() as Promise<SpotifyRecentlyPlayedResponse>;
}

export async function createSpotifyPlaylist(
  _accessToken: string,
  playlist: Track[],
  currentMood: string,
): Promise<{ trackCount: number; missingCount: number; externalUrl?: string }> {
  const searchResults = await Promise.all(
    playlist.map(async (track): Promise<string | undefined | null> => {
      if (track.spotifyUri) return track.spotifyUri;
      const query = encodeURIComponent(`track:${track.title} artist:${track.artist}`);
      const response = await spotifyApiFetch(`${API_BASE}/search?q=${query}&type=track&limit=1`);
      if (!response.ok) {
        if (response.status === 401) throw reconnectError();
        return null;
      }
      const data = (await response.json()) as { tracks?: { items?: SpotifySearchTrack[] } };
      return data.tracks?.items?.[0]?.uri;
    }),
  );
  const uris = searchResults.filter((uri): uri is string => !!uri);

  const createdResponse = await spotifyApiFetch(`${API_BASE}/me/playlists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "vibecode — " + (currentMood === "late night" ? "2 AM thoughts" : currentMood + " mix"),
      description: "Made for your mood with vibecode.",
      public: false,
    }),
  });
  if (!createdResponse.ok) {
    if (createdResponse.status === 401) throw reconnectError();
    throw new Error(`Could not create playlist (${createdResponse.status}). Check Spotify API access and your login.`);
  }

  const created = (await createdResponse.json()) as SpotifyPlaylistResponse;
  for (let index = 0; index < uris.length; index += 100) {
    const addResponse = await spotifyApiFetch(`${API_BASE}/playlists/${created.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: uris.slice(index, index + 100) }),
    });
    if (!addResponse.ok) {
      if (addResponse.status === 401) throw reconnectError();
      throw new Error(`Playlist created, but adding tracks failed (${addResponse.status}).`);
    }
  }

  return {
    trackCount: uris.length,
    missingCount: playlist.length - uris.length,
    externalUrl: created.external_urls?.spotify,
  };
}