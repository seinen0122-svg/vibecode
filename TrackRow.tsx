import { Heart, Music2, X } from "lucide-react";
import type { Track } from "../types/vibecode";

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
