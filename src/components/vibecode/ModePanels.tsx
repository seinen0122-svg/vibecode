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
