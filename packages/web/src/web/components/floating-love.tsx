import { useEffect, useState } from "react";
import { motion } from "motion/react";

interface RainParticle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  kind: "heart" | "petal";
  drift: number;
}

function createParticle(id: number): RainParticle {
  return {
    id,
    x: Math.random() * 100,
    size: 12 + Math.random() * 10,
    delay: Math.random() * 0.9,
    duration: 4.8 + Math.random() * 2.2,
    kind: Math.random() > 0.5 ? "heart" : "petal",
    drift: (Math.random() - 0.5) * 54,
  };
}

/** A short, one-time decorative SVG shower for the Tantri persona. */
export function FloatingLove({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<RainParticle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    setParticles(Array.from({ length: 8 }, (_, index) => createParticle(index)));
    const stop = window.setTimeout(() => setParticles([]), 8_000);
    return () => window.clearTimeout(stop);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ opacity: 0, y: "-12vh", x: 0, scale: 0.7, rotate: -20 }}
          animate={{
            opacity: [0, 0.3, 0.22, 0],
            y: "112vh",
            x: particle.drift,
            scale: [0.7, 1, 0.9],
            rotate: [0, 18, -12, 26],
          }}
          transition={{ duration: particle.duration, delay: particle.delay, ease: "easeInOut" }}
          className="absolute select-none will-change-transform"
          style={{ left: `${particle.x}%` }}
        >
          <svg width={particle.size} height={particle.size} viewBox="0 0 24 24" fill="none">
            {particle.kind === "heart" ? (
              <path d="M12 20.2 3.7 12.5C.8 9.8 2.7 5 6.6 5c2.1 0 3.6 1.2 4.4 2.5C11.8 6.2 13.3 5 15.4 5c3.9 0 5.8 4.8 2.9 7.5z" fill="#e77d9d" />
            ) : (
              <path d="M12 2.8c6.9 4.1 8.5 9 4.7 14.4-2.1 3-6.4 4.1-9.2 2.1C2.7 15.8 5.3 7.7 12 2.8Z" fill="#eaa3c6" />
            )}
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
