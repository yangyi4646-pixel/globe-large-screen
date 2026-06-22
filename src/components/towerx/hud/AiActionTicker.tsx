import { useEffect, useState } from 'react';
import { aiActions } from '../mock-data';

const ROTATE_MS = 4000;

/**
 * AiActionTicker — bottom-left single-line autonomous-AI activity log.
 * Separate from the right-column event feed: this one shows what the
 * AI is *doing* rather than what is happening.
 *
 * One line at a time, cross-fades every ROTATE_MS. The cycling index
 * is local to the component — no need to plumb it through App.
 */
export function AiActionTicker() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setI((n) => (n + 1) % aiActions.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    // Same dim bottom-left zone as Telemetry (over the globe
    // terminator) — carry the matching dark legibility halo so the
    // two readouts stay equally crisp without a glass card.
    <div
      className="pointer-events-none flex max-w-[640px] items-center gap-3"
      style={{
        textShadow:
          '0 1px 10px rgba(8,4,26,0.85), 0 0 3px rgba(8,4,26,0.95)'
      }}
    >
      <span
        className="text-meta-ghost shrink-0"
        style={{ letterSpacing: '0.32em' }}
      >
        AI ACTION
      </span>
      <span
        className="block h-3 w-px shrink-0"
        style={{ background: 'rgba(255, 255, 255, 0.18)' }}
      />
      <span
        key={i}
        className="ai-action-line min-w-0 truncate text-[12px] text-white/85"
      >
        {aiActions[i]}
      </span>
    </div>
  );
}
