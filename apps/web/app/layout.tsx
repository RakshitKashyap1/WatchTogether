import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WatchTogether",
  description: "Synchronized movie streaming with video, audio, and chat."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

