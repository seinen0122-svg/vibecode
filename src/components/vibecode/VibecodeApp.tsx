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
