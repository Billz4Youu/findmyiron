import type { SVGProps } from "react";

export type MascotMood = "happy" | "annoyed" | "broken";

interface IronMascotProps extends SVGProps<SVGSVGElement> {
  mood?: MascotMood;
}

// Maskot setrika kawaii dengan variasi ekspresi: happy, annoyed (bete/overdue), broken (rusak)
export default function IronMascot({
  mood = "happy",
  ...props
}: IronMascotProps) {
  const isBroken = mood === "broken";
  const isAnnoyed = mood === "annoyed";

  const label = isBroken
    ? "Maskot setrika sedang rusak dan berasap"
    : isAnnoyed
      ? "Maskot setrika pasang wajah bete karena kelamaan dipakai"
      : "Maskot setrika tersenyum";

  return (
    <svg viewBox="0 0 160 130" role="img" aria-label={label} {...props}>
      {/* Uap atau asap */}
      {isBroken ? (
        <g fill="#CBD5E1">
          <circle cx="88" cy="20" r="8" className="animate-steam" />
          <circle
            cx="106"
            cy="14"
            r="6"
            className="animate-steam [animation-delay:0.5s]"
          />
          <circle
            cx="72"
            cy="15"
            r="5.5"
            className="animate-steam [animation-delay:1s]"
          />
          <circle
            cx="30"
            cy="36"
            r="6.5"
            className="animate-steam [animation-delay:0.3s]"
          />
          <circle
            cx="44"
            cy="26"
            r="5"
            className="animate-steam [animation-delay:0.9s]"
          />
        </g>
      ) : (
        <g fill="white">
          <circle cx="30" cy="38" r="6" className="animate-steam" />
          <circle
            cx="44"
            cy="28"
            r="4.5"
            className="animate-steam [animation-delay:0.6s]"
          />
          <circle
            cx="22"
            cy="22"
            r="3.5"
            className="animate-steam [animation-delay:1.2s]"
          />
        </g>
      )}

      {/* Gagang */}
      <path
        d="M72 52 C72 28 80 22 98 22 L124 22 C134 22 138 28 138 38 L138 52"
        fill="none"
        stroke={isBroken ? "#94A3B8" : "#FDE68A"}
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Badan setrika */}
      <path
        d="M16 98 C16 68 42 52 80 52 L134 52 C142 52 146 58 146 66 L146 98 Z"
        fill={isBroken ? "#F1F5F9" : "white"}
      />

      {/* Alas setrika */}
      <rect
        x="12"
        y="96"
        width="138"
        height="12"
        rx="6"
        fill={isBroken ? "#64748B" : "#C4B5FD"}
      />

      {/* Plester perban kecil di badan saat rusak */}
      {isBroken && (
        <g transform="rotate(-18 58 76)">
          <rect
            x="44"
            y="70"
            width="28"
            height="11"
            rx="5"
            fill="#E2E8F0"
            stroke="#64748B"
            strokeWidth="2"
          />
          <rect x="53" y="71.5" width="10" height="8" rx="2" fill="#CBD5E1" />
        </g>
      )}

      {/* Simbol perempatan jengkel di dahi saat bete */}
      {isAnnoyed && (
        <g
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M68 58 Q72 62 68 66" />
          <path d="M76 58 Q72 62 76 66" />
          <path d="M68 59 Q72 63 76 59" />
          <path d="M68 65 Q72 61 76 65" />
        </g>
      )}

      {/* Mata & Alis */}
      {isBroken ? (
        <g stroke="#334155" strokeWidth="3.2" strokeLinecap="round">
          {/* Mata kiri X */}
          <line x1="91" y1="69" x2="101" y2="79" />
          <line x1="101" y1="69" x2="91" y2="79" />
          {/* Mata kanan X */}
          <line x1="117" y1="69" x2="127" y2="79" />
          <line x1="127" y1="69" x2="117" y2="79" />
        </g>
      ) : isAnnoyed ? (
        <g>
          {/* Alis menukik tajam */}
          <line
            x1="89"
            y1="65"
            x2="103"
            y2="71"
            stroke="#1E1B4B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="129"
            y1="65"
            x2="115"
            y2="71"
            stroke="#1E1B4B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Mata bete setengah tertutup */}
          <circle cx="96" cy="75" r="4.5" fill="#1E1B4B" />
          <circle cx="122" cy="75" r="4.5" fill="#1E1B4B" />
        </g>
      ) : (
        <g>
          <circle cx="96" cy="74" r="5" fill="#1E1B4B" />
          <circle cx="122" cy="74" r="5" fill="#1E1B4B" />
          <circle cx="97.8" cy="72.2" r="1.6" fill="white" />
          <circle cx="123.8" cy="72.2" r="1.6" fill="white" />
        </g>
      )}

      {/* Pipi */}
      <ellipse
        cx="86"
        cy="84"
        rx="6"
        ry="3.5"
        fill={isBroken ? "#CBD5E1" : isAnnoyed ? "#FDA4AF" : "#F9A8D4"}
      />
      <ellipse
        cx="132"
        cy="84"
        rx="6"
        ry="3.5"
        fill={isBroken ? "#CBD5E1" : isAnnoyed ? "#FDA4AF" : "#F9A8D4"}
      />

      {/* Mulut */}
      {isBroken ? (
        <path
          d="M101 88 Q109 79 117 88"
          fill="none"
          stroke="#334155"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      ) : isAnnoyed ? (
        <line
          x1="101"
          y1="86"
          x2="117"
          y2="86"
          stroke="#1E1B4B"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M102 82 Q109 90 116 82"
          fill="none"
          stroke="#1E1B4B"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Bayangan */}
      <ellipse
        cx="81"
        cy="124"
        rx="50"
        ry="4"
        fill={isBroken ? "#0F172A" : "#4C1D95"}
        opacity="0.25"
      />
    </svg>
  );
}
