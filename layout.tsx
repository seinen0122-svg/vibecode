import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vibecode — find your next favourite",
  description: "Mood playlists, discovery radio, and music chat.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
