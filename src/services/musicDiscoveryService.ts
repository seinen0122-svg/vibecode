import type { Track } from "../types/vibecode";
import { moodRelevance, normalise, sleep } from "../utils/music";

const MUSICBRAINZ_HEADERS = { Accept: "application/json" };

export async function discoverRealTracks(
  seedArtists: string[],
  accessToken: string,
  savedTrackKeys: string[],
  mood: string,
  genre: string,
): Promise<Track[]> {
  const seeds = seedArtists.slice(0, 6);
  if (!seeds.length) throw new Error("Analyze your Spotify saved tracks first.");

  const candidateIds = new Set<string>();

  // Find MusicBrainz artist IDs, then ask ListenBrainz for related recordings.
  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex++) {
    if (seedIndex > 0) await sleep(1100);
    const seed = seeds[seedIndex];
    const artistUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${seed}"`)}&fmt=json&limit=5`;
    const artistResponse = await fetch(artistUrl, { headers: MUSICBRAINZ_HEADERS });
    if (!artistResponse.ok) continue;
    const artistData = (await artistResponse.json()) as {
      artists?: Array<{ id: string; name: string }>;
    };
    const artists = artistData.artists ?? [];
    const match = artists.find((artist) => normalise(artist.name) === normalise(seed)) ?? artists[0];
    if (!match?.id) continue;

    const radioUrl = `https://api.listenbrainz.org/1/lb-radio/artist/${match.id}?max_similar_artists=10&max_recordings_per_artist=5&mode=easy&prompt=medium&pop_begin=0&pop_end=100`;
    const radioResponse = await fetch(radioUrl);
    if (!radioResponse.ok) continue;
    const radioData = (await radioResponse.json()) as Record<
      string,
      Array<{ recording_mbid?: string; similar_artist_name?: string; total_listen_count?: number }>
    >;
    const recordings = Object.values(radioData)
      .flat()
      .sort((a, b) => (b.total_listen_count ?? 0) - (a.total_listen_count ?? 0));
    for (const recording of recordings) {
      if (recording.recording_mbid) candidateIds.add(recording.recording_mbid);
    }
  }

  if (!candidateIds.size) {
    throw new Error("ListenBrainz returned no recordings for these artists. Try analyzing your library again.");
  }

  const saved = new Set(savedTrackKeys);
  const candidates: Track[] = [];
  const recordingIds = [...candidateIds].slice(0, 30);

  // MusicBrainz asks clients to keep requests to about one per second.
  for (let index = 0; index < recordingIds.length; index++) {
    if (index > 0) await sleep(1100);
    const recordingId = recordingIds[index];
    try {
      const response = await fetch(
        `https://musicbrainz.org/ws/2/recording/${recordingId}?fmt=json&inc=artists+tags`,
        { headers: MUSICBRAINZ_HEADERS },
      );
      if (!response.ok) continue;
      const recording = (await response.json()) as {
        title?: string;
        tags?: Array<{ name?: string }>;
        "artist-credit"?: Array<{
          name?: string;
          artist?: { name?: string };
          joinphrase?: string;
        }>;
      };
      const title = String(recording.title ?? "").trim();
      const artist = (recording["artist-credit"] ?? [])
        .map((credit) => `${credit.name ?? credit.artist?.name ?? ""}${credit.joinphrase ?? ""}`)
        .join("")
        .trim();
      if (!title || !artist || saved.has(normalise(`${title}${artist}`)) || saved.has(normalise(title))) {
        continue;
      }

      // Recording tags are imperfect and often absent, but they provide better genre clues
      // than assigning every catalogue result the same generic "Discovery" label.
      const tags = (recording.tags ?? [])
        .map((tag) => String(tag.name ?? "").trim().toLowerCase())
        .filter(Boolean);
      const genreTag = tags.find((tag) =>
        /indie|alternative|electronic|house|dream.?pop|shoegaze|ambient|folk|rock|pop|jazz|r&b|hip.?hop|soul|metal|classical|soundtrack|reggae|country|punk|disco|techno|house|ghazal|hindi|tamil/.test(
          tag,
        ),
      );
      const moodTags = tags.filter((tag) =>
        /romantic|love|sad|melanch|dream|nostalg|hopeful|ambient|focus|chill|relax|energetic|dance|night|happy|calm/.test(
          tag,
        ),
      );

      // Match each real catalogue candidate to an actual Spotify track.
      const query = encodeURIComponent(`track:${title} artist:${artist}`);
      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!spotifyResponse.ok) continue;
      const spotifyData = (await spotifyResponse.json()) as {
        tracks?: {
          items?: Array<{
            name: string;
            artists: Array<{ name: string }>;
            uri: string;
          }>;
        };
      };
      const spotifyTrack = (spotifyData.tracks?.items ?? []).find(
        (item) =>
          normalise(item.name) === normalise(title) &&
          item.artists.some(
            (candidateArtist) =>
              normalise(candidateArtist.name) === normalise(artist) ||
              normalise(artist).includes(normalise(candidateArtist.name)),
          ),
      ) ?? spotifyData.tracks?.items?.[0];
      if (!spotifyTrack?.uri) continue;

      const trackKey = normalise(
        `${spotifyTrack.name}${(spotifyTrack.artists ?? []).map((candidateArtist) => candidateArtist.name).join("")}`,
      );
      if (saved.has(trackKey) || saved.has(normalise(spotifyTrack.name))) continue;
      if (candidates.some((candidate) => candidate.spotifyUri === spotifyTrack.uri)) continue;

      const matchedArtist = (spotifyTrack.artists ?? [])
        .map((candidateArtist) => candidateArtist.name)
        .join(", ");
      const titleArtistHint =
        moodRelevance(
          {
            id: recordingId,
            title: spotifyTrack.name,
            artist: matchedArtist,
            genre: genreTag ?? "Discovery",
            mood: [],
            energy: 3,
            color: "",
          },
          mood,
        ) > 0;
      const moodTagMatch = moodTags.some((tag) => {
        const moodWords: Record<string, string[]> = {
          romantic: ["romantic", "love"],
          melancholic: ["sad", "melanch", "nostalg"],
          dreamy: ["dream", "ambient", "chill"],
          nostalgic: ["nostalg", "memory"],
          hopeful: ["hopeful", "happy"],
          focus: ["focus", "ambient", "calm"],
          "late night": ["night", "chill", "ambient"],
          energetic: ["energetic", "dance", "happy"],
        };
        return (moodWords[mood] ?? []).some((word) => tag.includes(word));
      });
      candidates.push({
        id: recordingId,
        title: spotifyTrack.name,
        artist: matchedArtist,
        genre: genreTag ?? "Discovery",
        mood: titleArtistHint || moodTagMatch ? [mood] : [],
        energy: 3,
        known: false,
        color: "linear-gradient(135deg,#4a8077,#d5b782)",
        spotifyUri: spotifyTrack.uri,
      });
    } catch (error) {
      console.warn("Skipping music catalogue candidate", recordingId, error);
    }
  }

  if (!candidates.length) {
    throw new Error("Found catalogue recordings, but couldn't match any new tracks on Spotify. Try again with different seed artists.");
  }

  // Gather the full candidate batch before ranking; stopping at 15 made the old sort
  // ineffective because it only ranked whichever 15 tracks happened to match first.
  const requestedGenre = genre.toLowerCase();
  return candidates
    .sort((a, b) => {
      const aMood = (a.mood.includes(mood) ? 2 : 0) + moodRelevance(a, mood);
      const bMood = (b.mood.includes(mood) ? 2 : 0) + moodRelevance(b, mood);
      const aGenre = requestedGenre === "any" || a.genre.toLowerCase().includes(requestedGenre) ? 1 : 0;
      const bGenre = requestedGenre === "any" || b.genre.toLowerCase().includes(requestedGenre) ? 1 : 0;
      return bMood - aMood || bGenre - aGenre;
    })
    .slice(0, 15);
}
