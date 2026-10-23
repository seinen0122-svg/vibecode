# vibecode — music discovery app

A responsive prototype with three modes:
- **Mood Mix**: a short quiz that creates a mood playlist.
- **Discovery Radio**: a feedback-driven stream that balances familiar and unfamiliar tracks.
- **AI Music Chat**: conversationally refine a music brief (rule-based demo; no paid AI API required).

## Run locally

Requirements: Node.js 20.9+ and npm.

1. Extract the ZIP.
2. Open the folder in VS Code.
3. In a terminal, run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Paste your Spotify **Client ID** into `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`.
6. In Spotify Developer Dashboard, set the exact Redirect URI to:
   `http://127.0.0.1:3000/callback`
7. Run `npm run dev`.
8. Open `http://localhost:3000`.

The OAuth redirect is configured to use `127.0.0.1` exactly; open the app at `http://127.0.0.1:3000` rather than `localhost` to avoid redirect URI mismatch.

## Spotify integration

This starter uses Authorization Code with PKCE (no Client Secret in the frontend), requests `playlist-modify-private`, searches Spotify's catalogue, creates a private playlist, and adds the selected tracks. Spotify API access is subject to your app's current Development Mode access and Spotify's policies. It does **not** use Spotify's restricted Recommendations or Audio Features endpoints.

The app has a demo catalogue so the interface and discovery feedback work before Spotify is connected. When connected, the playlist action searches for the chosen tracks in Spotify and adds matches. Search results may not match every demo song; unmatched tracks are skipped and the app reports the count.

## Important limitations

- Spotify Development Mode is for testing and has user/access limits. It is not approval for a commercial launch.
- Confirm Spotify's current policy permits your intended product and monetisation before launching publicly.
- The chat mode is a local rule-based prototype, not a real LLM.
- Discovery recommendations are a prototype heuristic, not a trained recommendation model.
- Do not commit `.env.local`, tokens, or user credentials.
