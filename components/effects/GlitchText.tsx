'use client';

import { useState, useEffect } from 'react';

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

interface GlitchTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export default function GlitchText({ text, className = '', speed = 50 }: GlitchTextProps) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        const resolved = text.slice(0, i);
        const glitch = Array.from({ length: Math.min(3, text.length - i) }, () =>
          GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        ).join('');
        setDisplay(resolved + glitch);
        i++;
      } else {
        setDisplay(text);
        setDone(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={className}>
      {display}
      {!done && <span className="cursor-blink text-terminal">_</span>}
    </span>
  );
}
