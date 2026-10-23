import type { MusicScope, Track } from "../types/vibecode";
import { moodRelevance, normalise, sleep } from "../utils/music";

const MUSICBRAINZ_HEADERS = { Accept: "application/json" };
const MAX_SEED_ARTISTS = 10;
const MAX_RECORDING_LOOKUPS = 40;
const REQUEST_DELAY_MS = 1100;
const INDIAN_GENRE_POOL = "__indian_genre_pool__";
const INTERNATIONAL_GENRE_POOL = "__international_genre_pool__";

// Tag-based radio supplies a genre-focused candidate pool instead of relying only
// on artist radio, which can drift into unrelated styles. ListenBrainz accepts
// repeated `tag` parameters with operator=OR.
const GENRE_TAG_SEARCHES: Record<string, string[]> = {
  bollywood: ["bollywood", "filmi", "hindi film", "bollywood retro", "bollywood classic"],
  indianpop: ["indian pop", "i-pop", "hindi pop", "hindi indie", "indian indie", "hindipop"],
  punjabi: ["punjabi", "punjabi pop", "punjabi hip-hop", "bhangra"],
  indianhiphop: ["indian hip-hop", "desi hip-hop", "indian rap", "hindi hip-hop", "punjabi hip-hop", "tamil hip-hop", "malayalam hip-hop"],
  southindian: ["tamil pop", "tamil film music", "kollywood", "telugu pop", "telugu film music", "tollywood", "malayalam pop", "malayalam film music", "kannada pop"],
  regional: ["bengali pop", "marathi pop", "haryanvi", "gujarati pop", "assamese music", "odia music", "bhojpuri", "regional indian music"],
  traditional: ["indian classical", "hindustani classical", "carnatic classical", "indian folk", "devotional", "ghazal", "sufi", "bhajan", "qawwali", "religious music"],
  international: ["international pop", "international rock", "global pop", "pop rock", "rock"],
  electronic: ["electronic", "electronica", "house", "techno", "edm", "electro", "dance music"],
  indie: ["indie", "alternative", "dream pop", "shoegaze"],
  globalhiphop: ["american hip-hop", "uk hip-hop", "global hip-hop", "international rap", "trap", "rap", "hip-hop"],
  internationalindie: ["international indie", "global indie", "indie", "alternative", "dream pop", "shoegaze", "indie pop", "indie rock"],
  globalrnb: ["global r&b", "contemporary r&b", "neo-soul", "soul", "funk", "r&b"],
  globaldance: ["afrobeats", "afropop", "reggaeton", "latin pop", "dancehall", "global dance"],
  mixedhiphop: ["indian hip-hop", "desi hip-hop", "indian rap", "hindi hip-hop", "punjabi hip-hop", "tamil hip-hop", "malayalam hip-hop", "american hip-hop", "uk hip-hop", "global hip-hop", "international rap", "trap", "rap", "hip-hop"],
  mixedpop: ["indian pop", "i-pop", "hindi pop", "hindi indie", "indian indie", "hindipop", "international pop", "global pop", "pop rock", "synth-pop", "dance-pop"],
  mixedindie: ["indian indie", "hindi indie", "indie", "alternative", "dream pop", "shoegaze", "indie pop", "indie rock"],
  mixedrnb: ["indian r&b", "r&b", "contemporary r&b", "neo-soul", "soul", "funk"],
  mixeddance: ["indian electronic", "electronic", "electronica", "house", "techno", "edm", "electro", "dance music", "synthwave", "downtempo", "trance", "breakbeat", "disco"],
  indian_any: ["bollywood", "filmi", "hindi film", "indian pop", "i-pop", "hindi pop", "hindi indie", "indian indie", "punjabi", "bhangra", "indian hip-hop", "desi hip-hop", "indian rap", "tamil pop", "tamil film music", "telugu pop", "malayalam pop", "kannada pop", "bengali pop", "marathi pop", "haryanvi", "gujarati pop", "assamese music", "odia music", "bhojpuri", "indian classical", "hindustani classical", "carnatic classical", "indian folk", "devotional", "ghazal", "sufi", "bhajan", "qawwali"],
  international_any: ["american hip-hop", "uk hip-hop", "global hip-hop", "international rap", "international pop", "international rock", "global pop", "pop rock", "international indie", "global indie", "indie", "alternative", "dream pop", "shoegaze", "contemporary r&b", "neo-soul", "soul", "funk", "electronic", "electronica", "house", "techno", "edm", "afrobeats", "afropop", "reggaeton", "latin pop", "dancehall"],
  mixed_any: ["bollywood", "filmi", "indian pop", "hindi indie", "punjabi", "bhangra", "indian hip-hop", "desi hip-hop", "tamil pop", "telugu pop", "malayalam pop", "bengali pop", "indian classical", "ghazal", "sufi", "american hip-hop", "uk hip-hop", "global hip-hop", "international rap", "international pop", "international rock", "global pop", "indie", "alternative", "dream pop", "shoegaze", "r&b", "soul", "funk", "electronic", "house", "techno", "afrobeats", "reggaeton"],
};

const GENRE_DISPLAY_NAMES: Record<string, string> = {
  bollywood: "Bollywood & Indian film songs",
  indianpop: "Indian pop & indie",
  punjabi: "Punjabi pop & hip-hop",
  indianhiphop: "Indian hip-hop & rap",
  southindian: "South Indian film & pop",
  regional: "Regional Indian music",
  traditional: "Indian classical / folk / devotional",
  international: "International pop & rock",
  electronic: "Dance / electronic / house",
  indie: "Indie / alternative",
  globalhiphop: "Global hip-hop & rap",
  internationalindie: "International indie & alternative",
  globalrnb: "Global R&B / soul / funk",
  globaldance: "Afrobeats / Latin / global dance",
  mixedhiphop: "Indian + international hip-hop",
  mixedpop: "Indian + international pop",
  mixedindie: "Indian + international indie",
  mixedrnb: "Indian + international R&B / soul / funk",
  mixeddance: "Indian + international electronic / dance",
  indian_any: "Any Indian style",
  international_any: "Any international style",
  mixed_any: "Indian + international mix",
};

function isRecognizedGenreTag(tag: string): boolean {
  return /indie|alternative|electronic|house|dream.?pop|shoegaze|ambient|folk|rock|pop|jazz|r&b|hip.?hop|rap|soul|metal|classical|soundtrack|reggae|country|punk|disco|techno|ghazal|hindi|tamil|telugu|malayalam|kannada|punjabi|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|bollywood|hindustani|synthwave|downtempo|trance|dubstep|breakbeat|ethereal|sufi|devotional|bhajan|qawwali|filmi|bhangra|carnatic|religious|desi|afrobeats|afropop|reggaeton|latin|dancehall|neosoul|funk|american|global|international|contemporary/.test(tag);
}

/**
 * Metadata can include several broad tags for one recording. When a user chooses a
 * specific non-electronic style, an explicit electronic-led tag must not be overridden
 * just because another broad tag also matches (for example, "indie" on an electronic track).
 */
function hasExplicitElectronicTag(tags: string[]): boolean {
  const electronicTag = /electronic|electronica|edm|house|techno|synthwave|trance|dubstep|drumandbass|breakbeat|idm|electro|futurebass|techhouse|deephouse|downtempo/;
  return tags.some((tag) => electronicTag.test(normalise(tag)));
}

function genreExplicitlyAllowsElectronic(requestedGenre: string): boolean {
  const requested = normalise(requestedGenre);
  return ["any", "indianany", "internationalany", "mixedany", "electronic", "mixeddance"].includes(requested);
}

function scoreMoodContext(tags: string[], primaryMood: string, extraMoods: string[]): number {
  const primaryScore = moodTagEvidence(tags, primaryMood);
  const uniqueExtra = [...new Set(extraMoods.map((mood) => mood.trim()).filter(Boolean))]
    .filter((mood) => normalise(mood) !== normalise(primaryMood));
  // The user's main mood dominates. Intent and setting refine it, but cannot outweigh it.
  const extraScore = uniqueExtra.reduce((total, mood) => {
    const score = moodTagEvidence(tags, mood);
    return total + (score > 0 ? score * 0.3 : score * 0.2);
  }, 0);
  return Math.max(-2, Math.min(5, primaryScore + extraScore));
}

function hasClearlyConflictingGenreTag(tags: string[], requestedGenre: string): boolean {
  const requested = normalise(requestedGenre);
  const conflicts: Record<string, RegExp> = {
    bollywood: /hip.?hop|rap|electronic|house|techno|metal|country|reggae|punk|disco|synthwave|dubstep|drum.?and.?bass/,
    indianpop: /bollywood|filmi|hip.?hop|rap|electronic|house|techno|metal|country|reggae|devotional|ghazal|sufi/,
    punjabi: /bollywood|filmi|hindustani|carnatic|indianclassical|ghazal|sufi/,
    indianhiphop: /bollywood|filmi|indianclassical|hindustani|carnatic|ghazal|sufi|devotional|country|reggae|deathmetal/,
    southindian: /bollywood|filmi|hindipop|hindifilm|punjabi|ghazal|sufi|indianclassical|hindustani/,
    regional: /bollywood|filmi|hindipop|hindifilm|indianclassical|hindustani|carnatic|ghazal|sufi/,
    traditional: /hip.?hop|rap|electronic|house|techno|edm|synthwave|dubstep|drum.?and.?bass|trap|reggaeton/,
    international: /bollywood|filmi|hindi|punjabi|tamil|telugu|malayalam|kannada|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|indianclassical|hindustani|carnatic|devotional|ghazal|sufi|bhajan|qawwali|desi/,
    electronic: /ghazal|bollywood|filmi|indianclassical|hindustani|carnatic|country|acousticfolk/,
    indie: /hip.?hop|rap|electronic|electronica|edm|house|techno|synthwave|trance|dubstep|drum.?and.?bass|breakbeat|bollywood|ghazal|filmi|punjabi|tamil.?film|telugu.?film|malayalam.?film/,
    globalhiphop: /indian|desi|hindi|punjabi|tamil|telugu|malayalam|kannada|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|bollywood|filmi/,
    internationalindie: /indian|desi|hindi|punjabi|tamil|telugu|malayalam|kannada|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|bollywood|filmi|electronic|electronica|edm|house|techno|synthwave|trance|dubstep|drum.?and.?bass|breakbeat/,
    globalrnb: /indian|desi|hindi|punjabi|tamil|telugu|malayalam|kannada|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|bollywood|filmi/,
    globaldance: /indian|desi|hindi|punjabi|tamil|telugu|malayalam|kannada|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|bollywood|filmi/,
    international_any: /indian|desi|hindi|punjabi|tamil|telugu|malayalam|kannada|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|bollywood|filmi|hindustani|carnatic|devotional|ghazal|sufi|bhajan|qawwali/,
    indian_any: /americanhiphop|ukhiphop|internationalpop|internationalrock|globalpop|globalhiphop|internationalrap|afrobeats|afropop|reggaeton|latinpop|dancehall|contemporaryrnb|neosoul/,
  };
  const conflict = conflicts[requested];
  return Boolean(conflict && tags.some((tag) => conflict.test(normalise(tag))));
}

type MusicBrainzArtist = { id: string; name: string };
type ListenBrainzRecording = {
  recording_mbid?: string;
  similar_artist_name?: string;
  total_listen_count?: number;
};
type MusicBrainzArtistCredit = {
  name?: string;
  artist?: { name?: string };
  joinphrase?: string;
};
type MusicBrainzRecording = {
  title?: string;
  tags?: Array<{ name?: string }>;
  "artist-credit"?: MusicBrainzArtistCredit[];
};
type SpotifySearchTrack = {
  name: string;
  artists: Array<{ name: string }>;
  uri: string;
};
type DiscoveryCandidate = {
  track: Track;
  sourceSeeds: string[];
  moodScore: number;
  genreScore: number;
  region: "indian" | "international" | "unknown";
  sceneKey: string;
  seedAffinity: number;
  rankScore: number;
};

/**
 * Use explicit catalogue tags as the strongest mood signal. Title/artist keyword
 * matches are weaker because a title alone cannot reliably establish a song's mood.
 */
function moodTagEvidence(tags: string[], mood: string): number {
  const value = normalise(mood);
  const normalizedTags = tags.map(normalise);
  const signals: Record<string, { positive: RegExp; negative: RegExp }> = {
    hopeful: {
      positive: /hopeful|uplifting|optimistic|positive|feelgood|inspirational|happy|joyful|bright/,
      negative: /despair|heartbreak|grief|depress|melanchol|darkambient/,
    },
    energetic: {
      positive: /energetic|upbeat|dance|highenergy|uptempo|intense|powerful|party/,
      negative: /sleep|sleepy|deepambient|slowcore|lullaby/,
    },
    dreamy: {
      positive: /dream|ethereal|ambient|shoegaze|hazy|atmospheric|chill/,
      negative: /aggressive|abrasive|hardcore/,
    },
    romantic: {
      positive: /romantic|love|tender|intimate|passionate|serenade/,
      negative: /rage|aggressive|violent/,
    },
    melancholic: {
      positive: /melanchol|sad|somber|heartbreak|grief|lonely|dark/,
      negative: /party|celebration|joyful|upbeat/,
    },
    nostalgic: {
      positive: /nostalg|retro|throwback|oldies|vintage|reminisc/,
      negative: /futuristic|experimentalclub/,
    },
    focus: {
      positive: /focus|instrumental|ambient|minimal|concentration|study/,
      negative: /party|anthem|highenergy/,
    },
    latenight: {
      positive: /night|nocturnal|late.?night|downtempo|ambient|chill|afterhours/,
      negative: /morning|workout|highenergy/,
    },
  };
  const signal = signals[value];
  if (!signal) return 0;
  if (normalizedTags.some((tag) => signal.positive.test(tag))) return 3;
  if (normalizedTags.some((tag) => signal.negative.test(tag))) return -0.75;
  return 0;
}

/** Group related catalogue tags into broad scenes to reduce one-scene domination. */
function getSceneKey(tags: string[], region: "indian" | "international" | "unknown"): string {
  const text = tags.map((tag) => tag.toLowerCase()).join(" | ");
  const normalized = tags.map(normalise);
  const has = (pattern: RegExp) => normalized.some((tag) => pattern.test(tag));

  if (/brazil|brasil|baile.?funk|funk.?carioca|funk.?brasileiro/.test(text) && /funk/.test(text)) return "brazilian-funk";
  if (has(/reggaeton|latinpop|latinurban/)) return "latin-dance";
  if (has(/afrobeats|afropop/)) return "afrobeats";
  if (has(/punjabihiphop|tamilhiphop|desihiphop|indianrap|hiphop|rap|trap|drill/)) return region === "indian" ? "indian-hiphop" : "hiphop-rap";
  if (has(/rnb|neosoul/)) return "rnb-soul";
  if (has(/funk/)) return "funk";
  if (has(/electronic|electronica|edm|house|techno|synthwave|trance|breakbeat|dubstep/)) return "electronic-dance";
  if (has(/indie|alternative|dreampop|shoegaze/)) return "indie-alternative";
  if (has(/rock|punk|metal/)) return "rock-heavy";
  if (has(/pop|bollywood|filmi|hindipop/)) return region === "indian" ? "indian-pop-film" : "pop";
  if (has(/classical|carnatic|hindustani|ghazal|sufi|devotional|qawwali/)) return "classical-traditional";
  if (tags.length) return `${region}:${normalise(tags[0]).slice(0, 28)}`;
  return `${region}:unclassified`;
}

function artistKeysForTrack(track: Track): string[] {
  return [...new Set(
    track.artist
      .split(/,|;|\bfeat(?:uring)?\.?\b|\bwith\b|\bx\b|\s&\s/i)
      .map((artist) => normalise(artist))
      .filter(Boolean),
  )];
}

/**
 * Select high-ranked candidates while limiting repeated artists and narrow scenes.
 * Caps are soft: later passes relax them only if a diverse list cannot be filled.
 */
function selectDiverseCandidates(
  candidates: DiscoveryCandidate[],
  limit: number,
  preferredSceneCap: number,
): DiscoveryCandidate[] {
  const ranked = [...candidates].sort((a, b) => b.rankScore - a.rankScore);
  const selected: DiscoveryCandidate[] = [];
  const selectedUris = new Set<string>();
  const artistCounts = new Map<string, number>();
  const sceneCounts = new Map<string, number>();
  // These are hard caps. If the catalogue lacks enough genuinely different candidates,
  // return fewer tracks rather than silently repeating one artist/scene to reach 15.
  const artistCap = 2;
  const sceneCap = Math.max(1, preferredSceneCap);

  for (const candidate of ranked) {
    if (selected.length >= limit) return selected;
    const uri = candidate.track.spotifyUri;
    if (!uri || selectedUris.has(uri)) continue;
    const artistKeys = artistKeysForTrack(candidate.track);
    if (artistKeys.some((artist) => (artistCounts.get(artist) ?? 0) >= artistCap)) continue;
    if ((sceneCounts.get(candidate.sceneKey) ?? 0) >= sceneCap) continue;

    selected.push(candidate);
    selectedUris.add(uri);
    for (const artist of artistKeys) artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
    sceneCounts.set(candidate.sceneKey, (sceneCounts.get(candidate.sceneKey) ?? 0) + 1);
  }
  return selected;
}

/**
 * Extract ListenBrainz recording objects without depending on one exact response nesting.
 * We stop descending once a recording is found so the same row isn't counted twice.
 */
function extractListenBrainzRecordings(value: unknown): ListenBrainzRecording[] {
  const found: ListenBrainzRecording[] = [];

  function visit(node: unknown) {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!node || typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    if (typeof record.recording_mbid === "string") {
      found.push({
        recording_mbid: record.recording_mbid,
        similar_artist_name:
          typeof record.similar_artist_name === "string" ? record.similar_artist_name : undefined,
        total_listen_count:
          typeof record.total_listen_count === "number" ? record.total_listen_count : undefined,
      });
      return;
    }
    for (const child of Object.values(record)) visit(child);
  }

  visit(value);
  return found;
}

function getRecordingArtistNames(credits: MusicBrainzArtistCredit[]): string[] {
  const names = credits.flatMap((credit) => [credit.artist?.name, credit.name]).filter(
    (name): name is string => typeof name === "string" && name.trim().length > 0,
  );
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

/**
 * Strictly check catalogue tags against the quiz's genre choices.
 * MusicBrainz tags are community-supplied and incomplete, so an untagged track
 * is excluded for a specific genre instead of being treated as a match.
 */
function tagMatchesRequestedGenre(tag: string, requestedGenre: string): boolean {
  const requested = normalise(requestedGenre);
  const actual = normalise(tag);
  if (!requested || requested === "any") return true;
  if (!actual) return false;

  const aliases: Record<string, string[]> = {
    bollywood: ["bollywood", "filmi", "hindifilm", "bollywoodretro", "bollywoodclassic", "bollywoodnewage", "bollywoodmodern", "bollywoodcomingofage"],
    indianpop: ["indianpop", "ipop", "hindipop", "hindiindie", "indianindie"],
    punjabi: ["punjabi", "bhangra", "punjabipop", "punjabihiphop", "punjabirap"],
    indianhiphop: ["indianhiphop", "desihiphop", "indianrap", "hindihiphop", "punjabihiphop", "tamilhiphop", "malayalamhiphop", "kannadahiphop", "hiphop", "rap"],
    southindian: ["southindian", "tamil", "tamilpop", "tamilfilm", "kollywood", "telugu", "telugupop", "telugufilm", "tollywood", "malayalam", "malayalampop", "malayalamfilm", "mollywood", "kannada", "kannadapop", "sandalwood"],
    regional: ["regionalindian", "bengali", "bengalipop", "marathi", "marathipop", "haryanvi", "haryanvipop", "gujarati", "gujaratipop", "assamese", "odia", "bhojpuri"],
    traditional: ["indianclassical", "hindustaniclassical", "carnaticclassical", "indianfolk", "folk", "devotional", "religiousmusic", "ghazal", "sufi", "bhajan", "qawwali", "hindustani", "carnatic"],
    international: ["internationalpop", "internationalrock", "globalpop", "poprock", "rock", "pop"],
    electronic: ["electronic", "electronica", "house", "techno", "edm", "electro", "synthwave", "downtempo", "trance", "drumandbass", "idm", "breakbeat", "dubstep", "disco", "dance"],
    indie: ["indie", "alternative", "dreampop", "shoegaze"],
    globalhiphop: ["americanhiphop", "ukhiphop", "globalhiphop", "internationalrap", "trap", "rap", "hiphop"],
    internationalindie: ["internationalindie", "globalindie", "indie", "alternative", "dreampop", "shoegaze", "indiepop", "indierock"],
    globalrnb: ["globalrnb", "contemporaryrnb", "neosoul", "soul", "funk", "rnb"],
    globaldance: ["afrobeats", "afropop", "reggaeton", "latinpop", "dancehall", "globaldance"],
    mixedhiphop: ["indianhiphop", "desihiphop", "indianrap", "hindihiphop", "punjabihiphop", "tamilhiphop", "malayalamhiphop", "americanhiphop", "ukhiphop", "globalhiphop", "internationalrap", "trap", "rap", "hiphop"],
    mixedpop: ["indianpop", "ipop", "hindipop", "hindiindie", "indianindie", "internationalpop", "globalpop", "poprock", "synthpop", "dancepop"],
    mixedindie: ["indianindie", "hindiindie", "indie", "alternative", "dreampop", "shoegaze", "indiepop", "indierock"],
    mixedrnb: ["indianrnb", "rnb", "contemporaryrnb", "neosoul", "soul", "funk"],
    mixeddance: ["indianelectronic", "electronic", "electronica", "house", "techno", "edm", "electro", "synthwave", "downtempo", "trance", "drumandbass", "idm", "breakbeat", "dubstep", "disco", "dance"],
    indian_any: ["bollywood", "filmi", "hindifilm", "indianpop", "ipop", "hindipop", "hindiindie", "indianindie", "punjabi", "bhangra", "indianhiphop", "desihiphop", "indianrap", "hindihiphop", "punjabihiphop", "tamil", "tamilpop", "tamilfilm", "telugu", "telugupop", "telugufilm", "malayalam", "malayalampop", "malayalamfilm", "kannada", "kannadapop", "bengali", "bengalipop", "marathi", "marathipop", "haryanvi", "gujarati", "assamese", "odia", "bhojpuri", "indianclassical", "hindustaniclassical", "carnaticclassical", "indianfolk", "devotional", "ghazal", "sufi", "bhajan", "qawwali"],
    international_any: ["americanhiphop", "ukhiphop", "globalhiphop", "internationalrap", "internationalpop", "internationalrock", "globalpop", "poprock", "internationalindie", "globalindie", "indie", "alternative", "dreampop", "shoegaze", "contemporaryrnb", "neosoul", "soul", "funk", "electronic", "electronica", "house", "techno", "edm", "afrobeats", "afropop", "reggaeton", "latinpop", "dancehall"],
    mixed_any: ["bollywood", "filmi", "indianpop", "indie", "hiphop", "rap", "pop", "rock", "rnb", "soul", "electronic", "house", "techno", "afrobeats", "reggaeton"],
  };
  const family = aliases[requested];
  if (family) return family.some((alias) => actual.includes(alias));

  // Keep future/new quiz genre values useful without silently treating missing tags as matches.
  return actual.includes(requested) || requested.includes(actual);
}

/**
 * Discovers tracks from up to ten taste-profile artists. Candidate provenance is kept
 * internally so the final selection is round-robin across seed-artist neighborhoods.
 * Spotify results are only accepted when both title and at least one credited artist match.
 */
const INDIAN_ORIGIN_TAG = /indian|desi|bollywood|filmi|hindi|tamil|telugu|malayalam|kannada|punjabi|bengali|marathi|haryanvi|gujarati|assamese|odia|bhojpuri|hindustani|carnatic|ghazal|sufi|bhajan|qawwali|kollywood|tollywood|mollywood|sandalwood|bhangra/;

const INDIAN_FALLBACK_TAGS = [
  "indian indie", "hindi indie", "indian pop", "indian hip-hop", "desi hip-hop",
  "tamil pop", "telugu pop", "malayalam pop", "punjabi pop", "bollywood",
  "indian classical", "indian folk", "ghazal", "sufi",
];
const INTERNATIONAL_FALLBACK_TAGS = [
  "international indie", "global indie", "international pop", "international rock",
  "american hip-hop", "uk hip-hop", "global hip-hop", "contemporary r&b",
  "electronic", "house", "techno", "afrobeats", "reggaeton", "latin pop",
];

function isIndianOriginTag(tag: string): boolean {
  return INDIAN_ORIGIN_TAG.test(tag.toLowerCase());
}

function regionalGenreTags(requestedGenre: string, region: "indian" | "international"): string[] {
  const raw = requestedGenre === "any"
    ? []
    : GENRE_TAG_SEARCHES[requestedGenre] ?? [];
  const regional = raw.filter((tag) => region === "indian" ? isIndianOriginTag(tag) : !isIndianOriginTag(tag));
  const fallback = region === "indian" ? INDIAN_FALLBACK_TAGS : INTERNATIONAL_FALLBACK_TAGS;
  // A mixed genre such as "mixedindie" needs region-specific searches, not a single OR
  // search that lets generic tags (e.g. "indie") drown out Indian candidates. If the
  // selected genre itself is regional (e.g. Bollywood), do not invent an unrelated
  // counterpart in the other region.
  if (regional.length) return [...new Set(regional)];
  if (raw.length) return [];
  return [...new Set(fallback)];
}

async function fetchTagRadio(tags: string[]): Promise<string[]> {
  if (!tags.length) return [];
  const params = new URLSearchParams({ operator: "OR", pop_begin: "0", pop_end: "100", count: "100" });
  for (const tag of tags) params.append("tag", tag);
  try {
    const response = await fetch(`https://api.listenbrainz.org/1/lb-radio/tags?${params.toString()}`);
    if (!response.ok) {
      console.warn("ListenBrainz regional tag search failed", response.status);
      return [];
    }
    const data: unknown = await response.json();
    return [...new Set(extractListenBrainzRecordings(data).map((item) => item.recording_mbid).filter((id): id is string => Boolean(id)))];
  } catch (error) {
    console.warn("ListenBrainz regional tag search failed", error);
    return [];
  }
}

/**
 * Auto mode uses artists weighted from saved and recently played Spotify tracks as its
 * primary discovery seeds. Explicit Indian/international modes use separate regional
 * tag pools. Mixed mode selects from both pools independently so a generic global tag
 * search cannot accidentally produce an all-international playlist.
 */
export async function discoverRealTracks(
  seedArtists: string[],
  accessToken: string,
  savedTrackKeys: string[],
  mood: string,
  genre: string,
  musicScope: MusicScope = "auto",
  likedTrackIds: string[] = [],
  dislikedTrackIds: string[] = [],
  moodContext: string[] = [],
  novelty: string = "balanced",
): Promise<Track[]> {
  const seeds = [...new Set(seedArtists.map((artist) => artist.trim()).filter(Boolean))].slice(0, MAX_SEED_ARTISTS);
  if (!seeds.length) throw new Error("Analyze your Spotify saved tracks and recent listening history first.");

  const requestedGenre = normalise(genre);
  const hasSpecificGenre = Boolean(requestedGenre && requestedGenre !== "any");
  const shouldSearchIndian = musicScope === "indian" || musicScope === "mixed";
  const shouldSearchInternational = musicScope === "international" || musicScope === "mixed";

  // Auto mode is deliberately history-led: don't run a broad world-wide tag search.
  const indianRecordingIds = shouldSearchIndian
    ? await fetchTagRadio(regionalGenreTags(hasSpecificGenre ? requestedGenre : "any", "indian"))
    : [];
  const internationalRecordingIds = shouldSearchInternational
    ? await fetchTagRadio(regionalGenreTags(hasSpecificGenre ? requestedGenre : "any", "international"))
    : [];
  const indianRecordingSet = new Set(indianRecordingIds);
  const internationalRecordingSet = new Set(internationalRecordingIds);

  const recordingIdsBySeed = new Map<string, string[]>();
  const recordingSources = new Map<string, string[]>();
  let lastMusicBrainzRequestAt = 0;
  async function waitForMusicBrainzRateLimit() {
    const elapsed = Date.now() - lastMusicBrainzRequestAt;
    if (lastMusicBrainzRequestAt && elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);
    lastMusicBrainzRequestAt = Date.now();
  }

  for (const seed of seeds) {
    await waitForMusicBrainzRateLimit();
    const artistUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${seed}"`)}&fmt=json&limit=5`;
    let artistResponse: Response;
    try {
      artistResponse = await fetch(artistUrl, { headers: MUSICBRAINZ_HEADERS });
    } catch (error) {
      console.warn("MusicBrainz artist search failed", seed, error);
      recordingIdsBySeed.set(seed, []);
      continue;
    }
    if (!artistResponse.ok) {
      recordingIdsBySeed.set(seed, []);
      continue;
    }
    const artistData = (await artistResponse.json()) as { artists?: MusicBrainzArtist[] };
    const match = (artistData.artists ?? []).find((artist) => normalise(artist.name) === normalise(seed));
    if (!match?.id) {
      recordingIdsBySeed.set(seed, []);
      continue;
    }

    const radioUrl = `https://api.listenbrainz.org/1/lb-radio/artist/${match.id}?max_similar_artists=10&max_recordings_per_artist=5&mode=easy&prompt=medium&pop_begin=0&pop_end=100`;
    let radioResponse: Response;
    try {
      radioResponse = await fetch(radioUrl);
    } catch (error) {
      console.warn("ListenBrainz artist radio failed", seed, error);
      recordingIdsBySeed.set(seed, []);
      continue;
    }
    if (!radioResponse.ok) {
      recordingIdsBySeed.set(seed, []);
      continue;
    }
    const radioData: unknown = await radioResponse.json();
    const recordings = extractListenBrainzRecordings(radioData).sort((a, b) => (b.total_listen_count ?? 0) - (a.total_listen_count ?? 0));
    const seedIds = [...new Set(recordings.map((item) => item.recording_mbid).filter((id): id is string => Boolean(id)))];
    recordingIdsBySeed.set(seed, seedIds);
    for (const recordingId of seedIds) {
      const sources = recordingSources.get(recordingId) ?? [];
      if (!sources.includes(seed)) sources.push(seed);
      recordingSources.set(recordingId, sources);
    }
  }

  const seedsWithCandidates = seeds.filter((seed) => (recordingIdsBySeed.get(seed)?.length ?? 0) > 0);
  if (!seedsWithCandidates.length && !indianRecordingIds.length && !internationalRecordingIds.length) {
    throw new Error("No recordings were found for these artists or regional tags. Try analyzing Spotify again or choosing a broader genre.");
  }

  const chosenRecordingIds: string[] = [];
  const chosenIds = new Set<string>();
  const addIds = (ids: string[], maxForSource: number) => {
    let added = 0;
    for (const id of ids) {
      if (chosenRecordingIds.length >= MAX_RECORDING_LOOKUPS || added >= maxForSource) break;
      if (chosenIds.has(id)) continue;
      chosenIds.add(id);
      chosenRecordingIds.push(id);
      added += 1;
    }
  };

  if (musicScope === "mixed") {
    // Interleave source lists to give both regional pools room in the finite lookup budget.
    const maxPerRegion = 16;
    for (let i = 0; i < maxPerRegion; i += 1) {
      if (indianRecordingIds[i] && !chosenIds.has(indianRecordingIds[i])) {
        chosenIds.add(indianRecordingIds[i]); chosenRecordingIds.push(indianRecordingIds[i]);
      }
      if (internationalRecordingIds[i] && !chosenIds.has(internationalRecordingIds[i]) && chosenRecordingIds.length < MAX_RECORDING_LOOKUPS) {
        chosenIds.add(internationalRecordingIds[i]); chosenRecordingIds.push(internationalRecordingIds[i]);
      }
    }
  } else if (musicScope === "indian") {
    addIds(indianRecordingIds, 28);
  } else if (musicScope === "international") {
    addIds(internationalRecordingIds, 28);
  }

  const seedCursors = new Map(seeds.map((seed) => [seed, 0]));
  let madeProgress = true;
  while (chosenRecordingIds.length < MAX_RECORDING_LOOKUPS && madeProgress) {
    madeProgress = false;
    for (const seed of seedsWithCandidates) {
      if (chosenRecordingIds.length >= MAX_RECORDING_LOOKUPS) break;
      const ids = recordingIdsBySeed.get(seed) ?? [];
      let cursor = seedCursors.get(seed) ?? 0;
      while (cursor < ids.length) {
        const id = ids[cursor++];
        seedCursors.set(seed, cursor);
        if (chosenIds.has(id)) continue;
        chosenIds.add(id);
        chosenRecordingIds.push(id);
        madeProgress = true;
        break;
      }
    }
  }

  const saved = new Set(savedTrackKeys);
  const liked = new Set(likedTrackIds);
  const disliked = new Set(dislikedTrackIds);
  const selectionPools = [
    ...seedsWithCandidates,
    ...(indianRecordingIds.length ? [INDIAN_GENRE_POOL] : []),
    ...(internationalRecordingIds.length ? [INTERNATIONAL_GENRE_POOL] : []),
  ];
  const discoveredBySeed = new Map<string, DiscoveryCandidate[]>();
  for (const seed of selectionPools) discoveredBySeed.set(seed, []);
  const seenSpotifyUris = new Set<string>();

  for (const recordingId of chosenRecordingIds) {
    await waitForMusicBrainzRateLimit();
    try {
      const response = await fetch(`https://musicbrainz.org/ws/2/recording/${recordingId}?fmt=json&inc=artists+tags`, { headers: MUSICBRAINZ_HEADERS });
      if (!response.ok) continue;
      const recording = (await response.json()) as MusicBrainzRecording;
      if (disliked.has(recordingId)) continue;
      const title = String(recording.title ?? "").trim();
      const credits = recording["artist-credit"] ?? [];
      const artistDisplay = credits.map((credit) => `${credit.name ?? credit.artist?.name ?? ""}${credit.joinphrase ?? ""}`).join("").trim();
      const catalogueArtistNames = getRecordingArtistNames(credits);
      if (!title || !artistDisplay || !catalogueArtistNames.length || saved.has(normalise(`${title}${artistDisplay}`)) || saved.has(normalise(title))) continue;

      const tags = (recording.tags ?? []).map((tag) => String(tag.name ?? "").trim().toLowerCase()).filter(Boolean);
      const matchingGenreTag = hasSpecificGenre ? tags.find((tag) => tagMatchesRequestedGenre(tag, genre)) : undefined;
      const recognizedGenreTags = tags.filter(isRecognizedGenreTag);
      const hasIndianTag = tags.some(isIndianOriginTag);
      const inIndianPool = indianRecordingSet.has(recordingId);
      const inInternationalPool = internationalRecordingSet.has(recordingId);
      let region: "indian" | "international" | "unknown" = "unknown";
      // The India-specific query is itself evidence of Indian-scene relevance. Prefer it
      // when the same recording also appears in a broad international/generic tag query.
      if (hasIndianTag || inIndianPool) region = "indian";
      else if (inInternationalPool) region = "international";

      const regionPoolMatch = region === "indian" ? inIndianPool : region === "international" ? inInternationalPool : false;

      // Respect explicit music-world choices before ranking. Unknown origin is not
      // silently treated as Indian or international.
      if (musicScope === "indian" && region !== "indian") continue;
      if (musicScope === "international" && region !== "international") continue;
      if (musicScope === "mixed" && region === "unknown") continue;

      // Specific genre choices are constraints, not just ranking hints. A conflicting
      // tag cannot be rescued by a generic matching tag, and electronic-led tracks are
      // excluded unless electronic/dance or a deliberately broad "any" option was chosen.
      if (hasSpecificGenre && hasClearlyConflictingGenreTag(recognizedGenreTags, genre)) continue;
      if (hasSpecificGenre && !genreExplicitlyAllowsElectronic(requestedGenre) && hasExplicitElectronicTag(tags)) continue;
      if (hasSpecificGenre && !matchingGenreTag && !regionPoolMatch) continue;
      const genreTag = matchingGenreTag
        ?? (regionPoolMatch ? `${GENRE_DISPLAY_NAMES[requestedGenre] ?? (genre === "any" ? "Discovery" : genre)} (${region} pool)` : recognizedGenreTags[0])
        ?? "Discovery";
      const moodTags = tags.filter((tag) => /romantic|love|sad|melanch|dream|nostalg|hopeful|ambient|focus|chill|relax|energetic|dance|night|happy|calm|uplifting|optimistic|positive|joyful|upbeat|uptempo|somber|heartbreak|grief|lonely|retro|throwback|vintage|instrumental|minimal|study|afterhours|sleepy|aggressive|party|celebration/.test(tag));
      const primaryArtist = credits.find((credit) => credit.artist?.name || credit.name);
      const searchArtist = (primaryArtist?.artist?.name ?? primaryArtist?.name ?? "").trim();
      if (!searchArtist) continue;

      const query = encodeURIComponent(`track:${title} artist:${searchArtist}`);
      const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!spotifyResponse.ok) continue;
      const spotifyData = (await spotifyResponse.json()) as { tracks?: { items?: SpotifySearchTrack[] } };
      const spotifyItems = spotifyData.tracks?.items ?? [];
      const catalogueArtistKeys = new Set(catalogueArtistNames.map(normalise).filter(Boolean));
      const spotifyTrack = spotifyItems.find((item) => normalise(item.name) === normalise(title) && (item.artists ?? []).some((candidateArtist) => catalogueArtistKeys.has(normalise(candidateArtist.name))));
      if (!spotifyTrack?.uri || seenSpotifyUris.has(spotifyTrack.uri)) continue;

      const spotifyTrackKey = normalise(`${spotifyTrack.name}${(spotifyTrack.artists ?? []).map((artist) => artist.name).join("")}`);
      if (saved.has(spotifyTrackKey) || saved.has(normalise(spotifyTrack.name))) continue;
      seenSpotifyUris.add(spotifyTrack.uri);

      const hintTrack: Track = {
        id: recordingId,
        title: spotifyTrack.name,
        artist: spotifyTrack.artists.map((artist) => artist.name).join(", "),
        genre: genreTag,
        mood: [],
        energy: 3,
        known: false,
        color: "linear-gradient(135deg,#4a8077,#d5b782)",
        spotifyUri: spotifyTrack.uri,
        originRegion: region,
      };
      const catalogueMoodScore = scoreMoodContext(moodTags, mood, moodContext);
      // Title/artist phrase matches are weak supporting evidence, not proof of mood.
      const titleArtistHintScore = moodRelevance(hintTrack, mood) > 0 ? 0.5 : 0;
      const hasMoodEvidence = catalogueMoodScore > 0 || titleArtistHintScore > 0;
      const track: Track = { ...hintTrack, mood: hasMoodEvidence ? [mood] : [] };
      const sourceSeeds = [
        ...(recordingSources.get(recordingId) ?? []),
        ...(inIndianPool ? [INDIAN_GENRE_POOL] : []),
        ...(inInternationalPool ? [INTERNATIONAL_GENRE_POOL] : []),
      ];
      const seedAffinity = sourceSeeds.filter((seed) => seed !== INDIAN_GENRE_POOL && seed !== INTERNATIONAL_GENRE_POOL).length;
      const moodScore = catalogueMoodScore + titleArtistHintScore;
      const genreScore = matchingGenreTag ? 4 : regionPoolMatch ? 3 : recognizedGenreTags.length ? 1.5 : 0.5;
      const candidate: DiscoveryCandidate = {
        track,
        sourceSeeds,
        moodScore,
        genreScore,
        region,
        sceneKey: getSceneKey(tags, region),
        seedAffinity,
        rankScore: 0,
      };
      // Prioritize demonstrated taste and the selected genre before novelty. In familiar
      // mode, candidates reached from several of the listener's seed artists rank higher;
      // adventurous mode allows more one-seed discoveries but never bypasses genre rules.
      const normalizedNovelty = normalise(novelty);
      const seedWeight = normalizedNovelty === "familiar" ? 2.0 : normalizedNovelty === "adventurous" ? 0.65 : 1.35;
      const moodWeight = 1.7;
      const genreWeight = hasSpecificGenre ? 2.5 : 1.2;
      candidate.rankScore =
        genreScore * genreWeight +
        moodScore * moodWeight +
        Math.min(seedAffinity, 4) * seedWeight +
        (liked.has(recordingId) ? 3 : 0);
      for (const sourceSeed of candidate.sourceSeeds) {
        const pool = discoveredBySeed.get(sourceSeed);
        if (pool) pool.push(candidate);
      }
    } catch (error) {
      console.warn("Skipping music catalogue candidate", recordingId, error);
    }
  }

  const uniqueCandidates = new Map<string, DiscoveryCandidate>();
  for (const pool of discoveredBySeed.values()) {
    for (const candidate of pool) {
      const uri = candidate.track.spotifyUri;
      if (!uri) continue;
      const existing = uniqueCandidates.get(uri);
      if (!existing || candidate.genreScore > existing.genreScore || candidate.moodScore > existing.moodScore) {
        uniqueCandidates.set(uri, candidate);
      }
    }
  }
  const allCandidates = [...uniqueCandidates.values()]
    .filter((candidate) => !disliked.has(candidate.track.id))
    .sort((a, b) => b.rankScore - a.rankScore);
  const isBroadGenre = !hasSpecificGenre || ["any", "indianany", "internationalany", "mixedany"].includes(requestedGenre);
  const sceneCap = isBroadGenre ? 3 : 5;

  if (musicScope === "mixed") {
    const indian = allCandidates.filter((candidate) => candidate.region === "indian");
    const international = allCandidates.filter((candidate) => candidate.region === "international");
    if (!indian.length || !international.length) {
      throw new Error(`Could not verify a genuine Indian + international mix for this genre (Indian: ${indian.length}, international: ${international.length}). Try a broader genre or use Auto, which follows your listening-history artists.`);
    }
    if (indian.length < 4 || international.length < 4) {
      throw new Error(`The catalogue only returned ${indian.length} verified Indian and ${international.length} verified international tracks. I did not substitute an all-international or all-Indian list; try a broader genre.`);
    }

    // Aim for 8 Indian + 7 international tracks. Each regional pool is ranked
    // independently, so a high-scoring international cluster cannot crowd out India.
    const selectedIndian = selectDiverseCandidates(indian, 8, sceneCap);
    const selectedInternational = selectDiverseCandidates(international, 7, sceneCap);
    const selected: Track[] = [];
    for (let i = 0; i < Math.max(selectedIndian.length, selectedInternational.length); i += 1) {
      if (selectedIndian[i]) selected.push(selectedIndian[i].track);
      if (selectedInternational[i]) selected.push(selectedInternational[i].track);
    }
    // Do not silently replace missing regional candidates with duplicates or saved songs.
    // If one region has insufficient candidates, return the verified results and say so.
    return selected.slice(0, 15);
  }

  const regionalCandidates = musicScope === "indian"
    ? allCandidates.filter((candidate) => candidate.region === "indian")
    : musicScope === "international"
      ? allCandidates.filter((candidate) => candidate.region === "international")
      : allCandidates;
  if (!regionalCandidates.length) {
    if (musicScope === "indian" || musicScope === "international") {
      throw new Error(`No verified ${musicScope} tracks were found for this selection. Try a broader genre or switch to Auto.`);
    }
    throw new Error("Found catalogue recordings, but couldn't verify any exact Spotify title-and-artist matches. Try analyzing your taste again.");
  }
  return selectDiverseCandidates(regionalCandidates, 15, sceneCap).map((candidate) => candidate.track);
}
