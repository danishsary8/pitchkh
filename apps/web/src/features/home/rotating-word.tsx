"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through words in place ("rival" → "team" → "crew"). All words sit in
 * one grid cell so the line keeps the width of the longest word and nothing
 * around it jumps. Screen readers and reduced-motion users get the first word.
 */
export function RotatingWord({ words, suffix = "", interval = 2600 }: { words: string[]; suffix?: string; interval?: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);
  return (
    <span className="inline-grid text-accent">
      <span className="sr-only">{words[0]}{suffix}</span>
      {words.map((word, i) => (
        <span key={i === index ? `${word}-on` : word} aria-hidden className={i === index ? "animate-word-in justify-self-start [grid-area:1/1]" : "invisible justify-self-start [grid-area:1/1]"}>
          {word}
          {/* The ending hugs each word, so "crew." has no gap when "friend" is the longest. */}
          <span className="text-pitch-foreground">{suffix}</span>
        </span>
      ))}
    </span>
  );
}
