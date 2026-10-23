# Vibecode — personalized music discovery

Vibecode is a Next.js and TypeScript music-discovery prototype. It uses Spotify authorization and available listening data to help create playlists, then explores unfamiliar artists related to a listener's taste.

## Current scope

- **Mood Mix:** generates a playlist using the user's music taste, selected mood, genre, and discovery preference.
- **Discovery Radio:** a prototype space for continuing discovery and using feedback to improve recommendations.
- **Music Chat:** deferred while the recommendation engine is improved.

Recommendations are still being refined. Catalogue metadata may be missing or inconsistent, so genre, language, and mood matches should be tested rather than assumed to be perfect.

## Requirements

- Node.js 20.9 or later
- npm
- A Spotify Developer app and Spotify Client ID for Spotify integration

## Run locally

1. Clone or download this repository.
2. In a terminal, install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and enter your Spotify Client ID.
4. In the Spotify Developer Dashboard, add the exact redirect URI configured in `.env.local`. The example uses:

   `http://127.0.0.1:3000/callback`

5. Open the app using the matching origin `http://127.0.0.1:3000`.
6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open `http://127.0.0.1:3000` in your browser.

On Windows PowerShell, use `npm.cmd` in place of `npm` if PowerShell blocks the npm script.

## Useful commands

```bash
npm run dev    # start the development server
npm run build  # verify a production build
npm run start  # serve the production build
```

## Configuration and security

- Never commit `.env.local`, Spotify tokens, API keys, or other credentials.
- `.env.example` is safe to commit only while it contains placeholders, not real secrets.
- Do not upload `node_modules` or `.next`; they are generated locally.
- Spotify API availability and permitted use depend on the app's current access level and Spotify's policies. Verify those requirements before any public launch.
