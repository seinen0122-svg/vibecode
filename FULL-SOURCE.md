# Complete source listing

This document contains the complete contents of every source file in the refactor package, plus `README.md`. Paths are relative to the root of the existing Next.js project unless stated otherwise.

## `README.md`

```markdown
# vibecode modular refactor

This is a behavior-preserving source refactor of the supplied `src/app/page.tsx` for a Next.js App Router project using TypeScript, React, and `lucide-react`.

## Structure

```text
src/
├── app/
│   └── page.tsx
├── components/
│   └── vibecode/
│       ├── ModePanels.tsx
│       ├── ShellSections.tsx
│       ├── TrackRow.tsx
│       └── VibecodeApp.tsx
├── data/
│   └── music.ts
├── hooks/
│   └── useVibecode.ts
├── services/
│   ├── musicDiscoveryService.ts
│   └── spotifyService.ts
├── types/
│   └── vibecode.ts
└── utils/
    └── music.ts
```

## Notes

- No packages were added.
- No CSS files were changed. Existing class names are preserved.
- There is no database service in the supplied implementation. Spotify calls and browser token storage are grouped in `services/spotifyService.ts`; MusicBrainz and ListenBrainz discovery calls are in `services/musicDiscoveryService.ts`.
- Existing prototype behavior, including current recommendation limitations and the demo Radio/Chat behavior, is retained.
- The data/service/utility files passed a strict TypeScript check. All source files passed TSX transpilation, and a broad type check passed with temporary declarations because this bundle does not include the app's `node_modules` or its real React/Next typings. Run the app's own build to perform the final project-level check.

```

## `src/app/page.tsx`

```tsx
"use client";

import { VibecodeApp } from "../components/vibecode/VibecodeApp";

export default function Page() {
  return <VibecodeApp />;
}

```

## `src/components/vibecode/ModePanels.tsx`

```tsx
import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ArrowRight,
  Check,
  Disc3,
  Headphones,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import type { ChatMessage, Mode, QuizQuestion, Track } from "../../types/vibecode";
import { TrackRow } from "./TrackRow";

type QuizPanelProps = {
  q: number;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  setMode: (mode: Mode) => void;
  setQ: Dispatch<SetStateAction<number>>;
  onMakePlaylist: () => void;
};

export function QuizPanel({ q, questions, answers, setAnswers, setMode, setQ, onMakePlaylist }: QuizPanelProps) {
  const question = questions[q];

  return (
    <section className="panel quiz-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">MOOD MIX / QUICK QUIZ</span>
          <h2>{question.title}</h2>
        </div>
        <button className="icon-button" onClick={() => setMode("home")}><X /></button>
      </div>
      <div className="progress">
        <span style={{ width: `${((q + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="option-grid">
        {question.options.map(([label, value]) => (
          <button
            key={label}
            className={`option ${answers[question.key] === value ? "active" : ""}`}
            onClick={() => setAnswers((previous) => ({ ...previous, [question.key]: value }))}
          >
            {label}
            {answers[question.key] === value && <Check size={17} />}
          </button>
        ))}
      </div>
      <div className="quiz-footer">
        <span>{q + 1} of {questions.length}</span>
        <button
          className="primary"
          disabled={!answers[question.key]}
          onClick={q < questions.length - 1 ? () => setQ((previous) => previous + 1) : onMakePlaylist}
        >
          {q === questions.length - 1 ? "Create my mix" : "Next question"} <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

type ResultPanelProps = {
  currentMood: string;
  playlist: Track[];
  liked: string[];
  disliked: string[];
  busy: boolean;
  connected: boolean;
  status: string;
  setMode: (mode: Mode) => void;
  onCreateSpotifyPlaylist: () => void;
  onRetakeQuiz: () => void;
  onFeedback: (kind: "like" | "dislike", track: Track) => void;
};

export function ResultPanel({
  currentMood,
  playlist,
  liked,
  disliked,
  busy,
  connected,
  status,
  setMode,
  onCreateSpotifyPlaylist,
  onRetakeQuiz,
  onFeedback,
}: ResultPanelProps) {
  return (
    <section className="panel result-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">YOUR PERSONAL SOUNDTRACK</span>
          <h2>{currentMood === "late night" ? "2 AM, no context" : currentMood.charAt(0).toUpperCase() + currentMood.slice(1) + " energy"}</h2>
          <p className="muted">A discovery mix built from real catalogue recordings. Your feedback shapes the next one.</p>
        </div>
        <button className="icon-button" onClick={() => setMode("home")}><X /></button>
      </div>
      <div className="track-list">
        {playlist.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            liked={liked.includes(track.id)}
            disliked={disliked.includes(track.id)}
            onLike={() => onFeedback("like", track)}
            onDislike={() => onFeedback("dislike", track)}
          />
        ))}
      </div>
      <div className="result-actions">
        <button className="primary" onClick={onCreateSpotifyPlaylist} disabled={busy}>
          {busy ? "Creating…" : <><Headphones size={17} /> {connected ? "Save to Spotify" : "Connect Spotify & save"}</>}
          <ArrowRight size={16} />
        </button>
        <button className="secondary" onClick={onRetakeQuiz}>Retake quiz</button>
      </div>
      {status && <p className="status-message">{status}</p>}
    </section>
  );
}

type RadioPanelProps = {
  activeTrack: Track;
  radioTracks: Track[];
  radioIndex: number;
  liked: string[];
  disliked: string[];
  setRadioIndex: Dispatch<SetStateAction<number>>;
  onFeedback: (kind: "like" | "dislike", track: Track) => void;
  onTurnIntoPlaylist: () => void;
};

export function RadioPanel({
  activeTrack,
  radioTracks,
  radioIndex,
  liked,
  disliked,
  setRadioIndex,
  onFeedback,
  onTurnIntoPlaylist,
}: RadioPanelProps) {
  const orderedQueue = useMemo(() => {
    const splitAt = (radioIndex + 1) % radioTracks.length;
    return radioTracks.slice(splitAt).concat(radioTracks.slice(0, splitAt)).slice(0, 5);
  }, [radioIndex, radioTracks]);

  return (
    <section className="panel radio-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">ENDLESS(ISH) DISCOVERY</span>
          <h2>Radio for your next obsession.</h2>
          <p className="muted">Mood Mix discovery is connected to live catalogue data; Radio integration comes next.</p>
        </div>
        <span className="live-tag"><span /> LIVE QUEUE</span>
      </div>
      <div className="radio-now">
        <div className="cover-art large" style={{ background: activeTrack.color }}>
          <Disc3 size={64} />
          <span className="cover-label">vibe / radar</span>
        </div>
        <div className="now-info">
          <span className="eyebrow">NOW IN YOUR ORBIT</span>
          <h3>{activeTrack.title}</h3>
          <p>{activeTrack.artist}</p>
          <span className="genre-tag">{activeTrack.genre}</span>
          <div className="feedback-row">
            <button className={`feedback ${liked.includes(activeTrack.id) ? "liked" : ""}`} onClick={() => onFeedback("like", activeTrack)}>
              <ThumbsUp size={16} /> More like this
            </button>
            <button className="feedback" onClick={() => onFeedback("dislike", activeTrack)}>
              <ThumbsDown size={16} /> Not for me
            </button>
          </div>
          <div className="radio-controls">
            <button className="secondary" onClick={() => setRadioIndex((previous) => (previous + 1) % radioTracks.length)}>
              Skip track <ArrowRight size={15} />
            </button>
            <button className="text-button" onClick={onTurnIntoPlaylist}>Turn into playlist</button>
          </div>
        </div>
      </div>
      <div className="queue-heading">
        <h3>Up next</h3>
        <span>{radioTracks.length} tracks in this session</span>
      </div>
      <div className="track-list compact">
        {orderedQueue.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            liked={liked.includes(track.id)}
            disliked={disliked.includes(track.id)}
            onLike={() => onFeedback("like", track)}
            onDislike={() => onFeedback("dislike", track)}
          />
        ))}
      </div>
    </section>
  );
}

type ChatPanelProps = {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  setMode: (mode: Mode) => void;
  onSendChat: () => void;
};

export function ChatPanel({ chatMessages, chatInput, setChatInput, setMode, onSendChat }: ChatPanelProps) {
  return (
    <section className="panel chat-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">MUSIC, IN YOUR WORDS</span>
          <h2>Describe the feeling.</h2>
          <p className="muted">A local demo that maps your prompt to moods and tracks.</p>
        </div>
        <button className="icon-button" onClick={() => setMode("home")}><X /></button>
      </div>
      <div className="chat-log">
        {chatMessages.map((message, index) => (
          <div key={index} className={`chat-bubble ${message.from}`}>{message.text}</div>
        ))}
      </div>
      <div className="prompt-chips">
        {["rainy late-night indie", "sunset drive, hopeful", "Tamil songs for a crush", "focus without lyrics"].map((prompt) => (
          <button key={prompt} className="prompt-chip" onClick={() => setChatInput(prompt)}>{prompt}</button>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSendChat();
        }}
      >
        <input
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder="Describe a vibe, moment or sound…"
        />
        <button className="primary" type="submit" aria-label="Send"><ArrowRight size={18} /></button>
      </form>
      <p className="fine-print">Demo mode: no conversation leaves your browser. Connect a real AI model later if you want richer dialogue.</p>
    </section>
  );
}

```

## `src/components/vibecode/ShellSections.tsx`

```tsx
import {
  AudioLines,
  ArrowRight,
  ChevronRight,
  Headphones,
  MessageCircle,
  Radio,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { Mode } from "../../types/vibecode";

type AppHeaderProps = {
  connected: boolean;
  onGoHome: () => void;
  onConnectSpotify: () => void;
};

export function AppHeader({ connected, onGoHome, onConnectSpotify }: AppHeaderProps) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onGoHome}>
        <span className="brand-mark"><AudioLines size={20} /></span>
        <span>vibecode<span className="dot">.</span></span>
      </button>
      <div className="top-actions">
        <span className="status-pill">
          <span className={`status-dot ${connected ? "online" : ""}`} />
          {connected ? "Spotify connected" : "Music discovery, remixed"}
        </span>
        <button className="avatar" onClick={onConnectSpotify} title="Connect Spotify">
          <Headphones size={17} />
        </button>
      </div>
    </header>
  );
}

type HeroSectionProps = {
  connected: boolean;
  tasteStatus: string;
  status: string;
  tasteProfile: string[];
  onBuildMoodMix: () => void;
  onStartRadio: () => void;
  onAnalyzeTaste: () => void;
};

export function HeroSection({
  connected,
  tasteStatus,
  status,
  tasteProfile,
  onBuildMoodMix,
  onStartRadio,
  onAnalyzeTaste,
}: HeroSectionProps) {
  return (
    <section className="hero">
      <div className="eyebrow"><Sparkles size={14} /> YOUR TASTE, IN ANOTHER DIMENSION</div>
      <h1>Find your<br /><span>next favourite.</span></h1>
      <p className="hero-copy">Less algorithm déjà vu. More “wait, who is THIS?”</p>
      <div className="hero-buttons">
        <button className="primary" onClick={onBuildMoodMix}>
          Build my mood mix <ArrowRight size={17} />
        </button>
        <button className="secondary" onClick={onStartRadio}>
          <Radio size={17} /> Start discovery radio
        </button>
      </div>
      <div className="taste-actions">
        <button className="secondary" onClick={onAnalyzeTaste} disabled={!connected}>
          Analyze my taste
        </button>
        {tasteStatus && <p className="status-message">{tasteStatus}</p>}
        {status && <p className="status-message">{status}</p>}
        {tasteProfile.length > 0 && (
          <div>
            <h3>Your recurring artists</h3>
            <p>{tasteProfile.join(" · ")}</p>
          </div>
        )}
      </div>
      <div className="hero-orb orb-one" />
      <div className="hero-orb orb-two" />
    </section>
  );
}

type ModeGridProps = {
  mode: Mode;
  onBuildMoodMix: () => void;
  onSelectRadio: () => void;
  onSelectChat: () => void;
};

export function ModeGrid({ mode, onBuildMoodMix, onSelectRadio, onSelectChat }: ModeGridProps) {
  return (
    <section className="mode-grid">
      <button className={`mode-card pink ${mode === "quiz" ? "selected" : ""}`} onClick={onBuildMoodMix}>
        <div className="mode-icon"><Sparkles /></div>
        <div className="mode-meta">
          <span>01 / PERSONALISE</span>
          <h2>Mood mix</h2>
          <p>A playlist for the feeling you can't quite explain.</p>
        </div>
        <ChevronRight className="mode-arrow" />
      </button>
      <button className={`mode-card green ${mode === "radio" ? "selected" : ""}`} onClick={onSelectRadio}>
        <div className="mode-icon"><Radio /></div>
        <div className="mode-meta">
          <span>02 / DISCOVER</span>
          <h2>Discovery radio</h2>
          <p>A living queue. More new finds, fewer repeats.</p>
        </div>
        <ChevronRight className="mode-arrow" />
      </button>
      <button className={`mode-card purple ${mode === "chat" ? "selected" : ""}`} onClick={onSelectChat}>
        <div className="mode-icon"><MessageCircle /></div>
        <div className="mode-meta">
          <span>03 / DESCRIBE IT</span>
          <h2>Music chat</h2>
          <p>Tell us the scene. We'll find the soundtrack.</p>
        </div>
        <ChevronRight className="mode-arrow" />
      </button>
    </section>
  );
}

type BottomNoteFooterProps = { onExplore: () => void };

export function BottomNoteFooter({ onExplore }: BottomNoteFooterProps) {
  return (
    <>
      <section className="bottom-note">
        <div className="note-icon"><WandSparkles /></div>
        <div>
          <strong>The more you explore, the better it gets.</strong>
          <p>Your likes and skips build a taste profile that travels across all three modes.</p>
        </div>
        <button className="text-button" onClick={onExplore}>Explore <ArrowRight size={15} /></button>
      </section>
      <footer>
        <span>vibecode<span className="dot">.</span> <span className="muted">Music discovery, not more of the same.</span></span>
        <span className="fine-print">Prototype · Mood Mix uses live discovery data; Radio and Chat still use demo tracks</span>
      </footer>
    </>
  );
}

```

## `src/components/vibecode/TrackRow.tsx`

```tsx
import { Heart, Music2, X } from "lucide-react";
import type { Track } from "../../types/vibecode";

type TrackRowProps = {
  track: Track;
  index: number;
  liked: boolean;
  disliked: boolean;
  onLike: () => void;
  onDislike: () => void;
};

export function TrackRow({
  track,
  index,
  liked,
  disliked,
  onLike,
  onDislike,
}: TrackRowProps) {
  return (
    <div className="track-row">
      <span className="track-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="track-cover" style={{ background: track.color }}>
        <Music2 size={18} />
      </div>
      <div className="track-main">
        <strong>{track.title}</strong>
        <span>{track.artist} · {track.genre}</span>
      </div>
      <span className="new-tag">{track.known ? "FAMILIAR" : "DISCOVER"}</span>
      <button
        className={`mini-action ${liked ? "active" : ""}`}
        onClick={onLike}
        aria-label="Like"
      >
        <Heart size={16} fill={liked ? "currentColor" : "none"} />
      </button>
      <button
        className={`mini-action ${disliked ? "active negative" : ""}`}
        onClick={onDislike}
        aria-label="Not for me"
      >
        <X size={16} />
      </button>
    </div>
  );
}

```

## `src/components/vibecode/VibecodeApp.tsx`

```tsx
import { useVibecode } from "../../hooks/useVibecode";
import { getRecommendations } from "../../utils/music";
import { BottomNoteFooter, AppHeader, HeroSection, ModeGrid } from "./ShellSections";
import { ChatPanel, QuizPanel, RadioPanel, ResultPanel } from "./ModePanels";

export function VibecodeApp() {
  const app = useVibecode();

  function buildMoodMix() {
    app.setQ(0);
    app.setAnswers({});
    app.setMode("quiz");
  }

  function turnRadioIntoPlaylist() {
    app.setAnswers({ mood: app.currentMood, genre: "any", novelty: "adventurous" });
    app.setPlaylist(getRecommendations(app.currentMood, "any", "adventurous", app.disliked));
    app.setMode("result");
  }

  return (
    <main className="app-shell">
      <AppHeader
        connected={app.connected}
        onGoHome={() => app.setMode("home")}
        onConnectSpotify={app.handlers.connectSpotify}
      />

      <HeroSection
        connected={app.connected}
        tasteStatus={app.tasteStatus}
        status={app.status}
        tasteProfile={app.tasteProfile}
        onBuildMoodMix={buildMoodMix}
        onStartRadio={() => app.setMode("radio")}
        onAnalyzeTaste={app.handlers.analyzeTaste}
      />

      <ModeGrid
        mode={app.mode}
        onBuildMoodMix={buildMoodMix}
        onSelectRadio={() => app.setMode("radio")}
        onSelectChat={() => app.setMode("chat")}
      />

      {app.mode === "quiz" && (
        <QuizPanel
          q={app.q}
          questions={app.questions}
          answers={app.answers}
          setAnswers={app.setAnswers}
          setMode={app.setMode}
          setQ={app.setQ}
          onMakePlaylist={app.handlers.makePlaylist}
        />
      )}

      {app.mode === "result" && (
        <ResultPanel
          currentMood={app.currentMood}
          playlist={app.playlist}
          liked={app.liked}
          disliked={app.disliked}
          busy={app.busy}
          connected={app.connected}
          status={app.status}
          setMode={app.setMode}
          onCreateSpotifyPlaylist={app.handlers.createSpotifyPlaylist}
          onRetakeQuiz={buildMoodMix}
          onFeedback={app.handlers.feedback}
        />
      )}

      {app.mode === "radio" && (
        <RadioPanel
          activeTrack={app.activeTrack}
          radioTracks={app.radioTracks}
          radioIndex={app.radioIndex}
          liked={app.liked}
          disliked={app.disliked}
          setRadioIndex={app.setRadioIndex}
          onFeedback={app.handlers.feedback}
          onTurnIntoPlaylist={turnRadioIntoPlaylist}
        />
      )}

      {app.mode === "chat" && (
        <ChatPanel
          chatMessages={app.chatMessages}
          chatInput={app.chatInput}
          setChatInput={app.setChatInput}
          setMode={app.setMode}
          onSendChat={app.handlers.sendChat}
        />
      )}

      <BottomNoteFooter onExplore={() => app.setMode("radio")} />
    </main>
  );
}

```

## `src/data/music.ts`

```typescript
import type { Track, QuizQuestion } from "../types/vibecode";

export const tracks: Track[] = [
  {id:"t1",title:"The Night We Met",artist:"Lord Huron",genre:"Indie folk",mood:["nostalgic","melancholic","late night"],energy:2,known:true,color:"linear-gradient(135deg,#193d55,#b26b79)"},
  {id:"t2",title:"Space Song",artist:"Beach House",genre:"Dream pop",mood:["dreamy","melancholic","late night"],energy:2,known:true,color:"linear-gradient(135deg,#25204c,#d16b94)"},
  {id:"t3",title:"Sweet Disposition",artist:"The Temper Trap",genre:"Indie rock",mood:["hopeful","energetic","nostalgic"],energy:4,known:true,color:"linear-gradient(135deg,#f5a16a,#624c87)"},
  {id:"t4",title:"Show Me How",artist:"Men I Trust",genre:"Dream pop",mood:["dreamy","romantic","late night"],energy:2,color:"linear-gradient(135deg,#0f6c73,#d8c7a0)"},
  {id:"t5",title:"My Love Mine All Mine",artist:"Mitski",genre:"Indie",mood:["romantic","melancholic"],energy:1,color:"linear-gradient(135deg,#a17a62,#252d3d)"},
  {id:"t6",title:"Glue",artist:"Bicep",genre:"Electronic",mood:["dreamy","energetic","late night"],energy:4,color:"linear-gradient(135deg,#e78a68,#613f92)"},
  {id:"t7",title:"Sunsetz",artist:"Cigarettes After Sex",genre:"Dream pop",mood:["romantic","late night","melancholic"],energy:1,color:"linear-gradient(135deg,#5e657a,#d8a6b7)"},
  {id:"t8",title:"Borderline",artist:"Tame Impala",genre:"Psychedelic pop",mood:["dreamy","hopeful"],energy:3,color:"linear-gradient(135deg,#e8a75e,#d46d6d)"},
  {id:"t9",title:"A Walk",artist:"Tycho",genre:"Ambient electronic",mood:["focus","dreamy","hopeful"],energy:3,color:"linear-gradient(135deg,#5aa5ad,#e6d6a6)"},
  {id:"t10",title:"Archie, Marry Me",artist:"Alvvays",genre:"Indie pop",mood:["hopeful","romantic","energetic"],energy:4,color:"linear-gradient(135deg,#c77a83,#e6c8a0)"},
  {id:"t11",title:"Tadow",artist:"Masego, FKJ",genre:"Jazz/R&B",mood:["romantic","dreamy"],energy:3,color:"linear-gradient(135deg,#264c42,#d5a15e)"},
  {id:"t12",title:"Aaj Jaane Ki Zid Na Karo",artist:"Farida Khanum",genre:"Ghazal",mood:["nostalgic","romantic","late night"],energy:1,color:"linear-gradient(135deg,#a04c47,#e2bd91)"},
  {id:"t13",title:"Iktara",artist:"Kavita Seth, Amit Trivedi",genre:"Hindi indie",mood:["hopeful","nostalgic","romantic"],energy:2,color:"linear-gradient(135deg,#d08c6e,#563f63)"},
  {id:"t14",title:"Kasoor",artist:"Prateek Kuhad",genre:"Hindi indie",mood:["melancholic","romantic","late night"],energy:2,color:"linear-gradient(135deg,#424c69,#d19a84)"},
  {id:"t15",title:"Katchi Sera",artist:"Sai Abhyankkar",genre:"Tamil pop",mood:["romantic","energetic"],energy:4,color:"linear-gradient(135deg,#d07a3c,#693b65)"},
  {id:"t16",title:"Enjoy the Silence",artist:"Depeche Mode",genre:"Alternative",mood:["late night","dreamy"],energy:3,color:"linear-gradient(135deg,#20212f,#887caa)"},
  {id:"t17",title:"Odyssey",artist:"HOME",genre:"Synthwave",mood:["focus","dreamy","hopeful"],energy:3,color:"linear-gradient(135deg,#e9a1c9,#414f9c)"},
  {id:"t18",title:"Kerala",artist:"Bonobo",genre:"Downtempo",mood:["focus","dreamy"],energy:3,color:"linear-gradient(135deg,#4a8077,#d5b782)"},
  {id:"t19",title:"Jashn-e-Bahaaraa",artist:"A. R. Rahman, Javed Ali",genre:"Hindi film",mood:["romantic","nostalgic"],energy:2,color:"linear-gradient(135deg,#ab9a67,#60466b)"},
  {id:"t20",title:"Sun Models",artist:"ODESZA, Madelyn Grant",genre:"Electronic",mood:["hopeful","energetic"],energy:4,color:"linear-gradient(135deg,#e7b56e,#4a7e88)"},
];

export const questions: QuizQuestion[] = [
  {title:"What are you feeling right now?", key:"mood", options:[["Happy & alive","hopeful"],["A little lost","melancholic"],["Nostalgic","nostalgic"],["Romantic","romantic"],["In my own world","dreamy"],["Need to focus","focus"]]},
  {title:"What should the music do?", key:"intent", options:[["Make me feel understood","melancholic"],["Help me escape","dreamy"],["Give me energy","energetic"],["Slow everything down","late night"],["Make the moment cinematic","romantic"]]},
  {title:"Choose your setting", key:"setting", options:[["2 AM, lights off","late night"],["Golden-hour drive","hopeful"],["Rainy window seat","melancholic"],["Friends, no plans","energetic"],["Quiet cafe","focus"]]},
  {title:"Pick your musical comfort zone", key:"genre", options:[["Indie & alternative","Indie"],["Hindi indie & classics","Hindi"],["Electronic & house","Electronic"],["Dream pop & shoegaze","Dream pop"],["Anything, surprise me","any"]]},
  {title:"How adventurous should we be?", key:"novelty", options:[["Keep it familiar","familiar"],["A balanced mix","balanced"],["Deep cuts only","adventurous"]]},
];

```

## `src/hooks/useVibecode.ts`

```typescript
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

```

## `src/services/musicDiscoveryService.ts`

```typescript
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

```

## `src/services/spotifyService.ts`

```typescript
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

```

## `src/types/vibecode.ts`

```typescript
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

```

## `src/utils/music.ts`

```typescript
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

```
