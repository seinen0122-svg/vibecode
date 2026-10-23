import {
  AudioLines,
  ArrowRight,
  ChevronRight,
  Headphones,
  Radio,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { Mode } from "../types/vibecode";

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
};

export function ModeGrid({ mode, onBuildMoodMix, onSelectRadio }: ModeGridProps) {
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
          <p>Your likes and skips build a taste profile that travels across Mood Mix and Discovery Radio.</p>
        </div>
        <button className="text-button" onClick={onExplore}>Explore <ArrowRight size={15} /></button>
      </section>
      <footer>
        <span>vibecode<span className="dot">.</span> <span className="muted">Music discovery, not more of the same.</span></span>
        <span className="fine-print">Prototype · Mood Mix uses live discovery data; Radio still uses demo tracks</span>
      </footer>
    </>
  );
}
