import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoveParticle {
  id: number;
  x: number;       // 0–100vw percentage
  size: number;     // px
  delay: number;    // seconds
  duration: number; // seconds
  emoji: string;
  drift: number;    // horizontal drift in px
}

const HEARTS = ["💕", "💖", "💗", "✨", "💙", "🩵"];

let nextId = 0;

function spawnParticle(): LoveParticle {
  return {
    id: nextId++,
    x: Math.random() * 100,
    size: 14 + Math.random() * 16,        // 14–30px
    delay: Math.random() * 2,              // 0–2s stagger
    duration: 6 + Math.random() * 6,       // 6–12s float
    emoji: HEARTS[Math.floor(Math.random() * HEARTS.length)],
    drift: (Math.random() - 0.5) * 80,    // ±40px horizontal drift
  };
}

/**
 * Floating love emoji rain — subtle, low-opacity, non-interactive.
 * Only renders when `active` is true.
 */
export function FloatingLove({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<LoveParticle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Initial batch — staggered so screen isn't empty at first
    const initial = Array.from({ length: 8 }, spawnParticle);
    setParticles(initial);

    // Continuously spawn new ones
    const interval = setInterval(() => {
      setParticles((prev) => {
        // Cap at ~20 particles to keep it light
        const kept = prev.length >= 20 ? prev.slice(-15) : prev;
        return [...kept, spawnParticle()];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              opacity: 0,
              y: "100vh",
              x: 0,
              scale: 0.6,
              rotate: -20 + Math.random() * 40,
            }}
            animate={{
              opacity: [0, 0.35, 0.3, 0],
              y: "-10vh",
              x: p.drift,
              scale: [0.6, 1, 0.9],
              rotate: 10 + Math.random() * 30,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "linear",
            }}
            className="absolute select-none"
            style={{
              left: `${p.x}%`,
              fontSize: `${p.size}px`,
              filter: "blur(0.5px)",
            }}
            aria-hidden
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
