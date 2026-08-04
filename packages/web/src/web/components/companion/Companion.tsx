import { usePersona } from "@/lib/persona";
import { useCompanionBrain } from "@/lib/companion/useCompanionBrain";
import type { CompanionStatus } from "@/lib/companion/engine";

const STATUS_TRANSFORMS: Record<CompanionStatus, string> = {
  idle: "translateY(0)",
  walking: "translateX(12px)",
  sleeping: "translateY(7px) rotate(12deg)",
  reading: "translateY(2px) rotate(-3deg)",
  working: "translateY(2px)",
  praying: "translateY(8px) rotate(8deg)",
  thinking: "translateY(-3px)",
  celebrating: "translateY(-10px)",
};

const PERSONA_COLORS = {
  default: { body: "#8a9a92", accent: "#557267" },
  tantri: { body: "#ec8faa", accent: "#b94d73" },
  ihsan: { body: "#70a8e8", accent: "#3472b8" },
} as const;

function ClosedEyes() {
  return <path d="M45 49q5 5 10 0m10 0q5 5 10 0" fill="none" stroke="#29443b" strokeWidth="2.5" strokeLinecap="round" />;
}

function OpenEyes() {
  return <><circle cx="50" cy="48" r="2.5" fill="#29443b" /><circle cx="70" cy="48" r="2.5" fill="#29443b" /></>;
}

function Hearts() {
  return (
    <g className="companion-hearts" fill="#e96f96">
      <path d="M22 38c-5-6 4-11 8-5 4-6 13-1 8 5l-8 8z" />
      <path d="M83 27c-4-5 3-9 6-4 3-5 10-1 6 4l-6 6z" />
      <path d="M91 60c-3-4 3-7 5-3 3-4 8-1 5 3l-5 5z" />
    </g>
  );
}

function Book() {
  return <g className="companion-prop"><path d="M16 73q10-5 20 0v18q-10-5-20 0z" fill="#f9e3a3" stroke="#8c7138" strokeWidth="1.5" /><path d="M36 73q10-5 20 0v18q-10-5-20 0z" fill="#ffeebd" stroke="#8c7138" strokeWidth="1.5" /></g>;
}

export function Companion() {
  const persona = usePersona();
  const { status } = useCompanionBrain();
  const variant = persona === "tantri" || persona === "ihsan" ? persona : "default";
  const colors = PERSONA_COLORS[variant];
  const isSleeping = status === "sleeping";
  const showHearts = variant === "tantri" && (status === "idle" || status === "celebrating");

  return (
    <div className="companion-wrapper" aria-label={`Companion sedang ${status}`}>
      <style>{`
        @keyframes companion-float { 0%,100% { translate: 0 0; } 50% { translate: 0 -5px; } }
        @keyframes companion-walk { 0%,100% { translate: 0 0; } 50% { translate: 4px -2px; } }
        @keyframes companion-celebrate { 0%,100% { translate: 0 0; } 45% { translate: 0 -9px; } 65% { translate: 0 0; } }
        @keyframes companion-hearts { 0%,100% { opacity: .2; translate: 0 3px; } 50% { opacity: .8; translate: 0 -3px; } }
        .companion-wrapper { position: fixed; right: max(1rem, env(safe-area-inset-right)); bottom: max(1rem, env(safe-area-inset-bottom)); z-index: 40; width: clamp(5.25rem, 10vw, 7.5rem); pointer-events: none; filter: drop-shadow(0 8px 9px rgb(24 57 45 / .16)); }
        .companion-character { transform-origin: center; transition: transform 700ms cubic-bezier(.22,1,.36,1); animation: companion-float 4s ease-in-out infinite; }
        .companion-walking { animation-name: companion-walk; animation-duration: .8s; }
        .companion-celebrating { animation-name: companion-celebrate; animation-duration: .9s; }
        .companion-hearts { animation: companion-hearts 2.6s ease-in-out infinite; }
        @media (max-width: 640px) { .companion-wrapper { right: .65rem; bottom: .75rem; opacity: .88; } }
        @media (prefers-reduced-motion: reduce) { .companion-character, .companion-hearts { animation: none; transition: none; } }
      `}</style>
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <ellipse cx="61" cy="104" rx="29" ry="7" fill="rgb(30 55 45 / .16)" />
        <g
          className={`companion-character companion-${status}`}
          style={{ transform: STATUS_TRANSFORMS[status] }}
        >
          {showHearts && <Hearts />}
          {status === "thinking" && <g fill={colors.accent} opacity=".72"><circle cx="84" cy="27" r="3" /><circle cx="91" cy="20" r="4.5" /><circle cx="101" cy="12" r="6" /></g>}
          {status === "working" && <rect x="72" y="72" width="27" height="18" rx="3" fill="#577267" stroke="#365449" strokeWidth="2" />}
          <ellipse cx="60" cy="70" rx="28" ry="27" fill={colors.body} />
          <circle cx="60" cy="45" r="24" fill={colors.body} />
          {isSleeping ? <ClosedEyes /> : <OpenEyes />}
          {status === "praying" && <path d="M38 73q22 16 44 0" fill="none" stroke={colors.accent} strokeWidth="5" strokeLinecap="round" />}
          {variant === "tantri" && <><path d="M40 66h40l-5 29H45z" fill={colors.accent} opacity=".92" /><path d="M60 66v29" stroke="#ffe1ea" strokeWidth="2" /><g transform="translate(78 35)"><circle r="6" fill="#ffd05f" /><path d="M0-12v24M-12 0h24M-8-8l16 16M8-8L-8 8" stroke="#e87195" strokeWidth="3" strokeLinecap="round" /></g></>}
          {variant === "ihsan" && <><path d="M39 44a21 21 0 0 1 42 0" fill="none" stroke="#2e5f98" strokeWidth="4" strokeLinecap="round" /><rect x="32" y="45" width="8" height="15" rx="4" fill="#2e5f98" /><rect x="80" y="45" width="8" height="15" rx="4" fill="#2e5f98" /></>}
          {status === "reading" && <Book />}
          {status === "celebrating" && <path d="M30 37l-8-7m68 7 8-7M29 61l-11 2m73-2 11 2" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />}
          {status === "walking" && <path d="M44 94l-8 9m38-9 8 9" stroke={colors.accent} strokeWidth="5" strokeLinecap="round" />}
        </g>
      </svg>
    </div>
  );
}
