import IronMascot from "./IronMascot";

// Rumah/kamar kawaii berisi maskot setrika, nomor kamar tampil di atap
export default function IronHouse({
  room,
  isOverdue = false,
}: {
  room: string;
  isOverdue?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 200 175"
      className="h-auto w-full"
      role="img"
      aria-label={`Setrika sedang berada di kamar ${room}`}
    >
      {/* asap cerobong */}
      <g fill="white">
        <circle cx="150" cy="22" r="5" className="animate-steam" />
        <circle
          cx="158"
          cy="12"
          r="3.5"
          className="animate-steam [animation-delay:0.8s]"
        />
      </g>
      {/* cerobong */}
      <rect x="140" y="30" width="16" height="30" rx="4" fill="#9F1239" />
      {/* dinding */}
      <rect x="34" y="72" width="132" height="90" rx="14" fill="#FFF7ED" />
      {/* atap, stroke tebal membuat sudutnya membulat */}
      <path
        d="M22 80 L100 20 L178 80 Z"
        fill={isOverdue ? "#991B1B" : "#7C3AED"}
        stroke={isOverdue ? "#991B1B" : "#7C3AED"}
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <text
        x="100"
        y="70"
        textAnchor="middle"
        fontSize="24"
        fontWeight="800"
        fill="white"
        fontFamily="var(--font-geist-sans), sans-serif"
      >
        {room}
      </text>
      {/* jendela kamar yang menyala */}
      <rect
        x="52"
        y="90"
        width="96"
        height="62"
        rx="14"
        fill={isOverdue ? "#FECACA" : "#FDE68A"}
      />
      {/* maskot di dalam kamar */}
      <g className="animate-wiggle">
        <IronMascot
          mood={isOverdue ? "annoyed" : "happy"}
          x="58"
          y="94"
          width="84"
          height="66"
          aria-hidden="true"
          role="presentation"
        />
      </g>
      {/* tanaman kecil */}
      <circle cx="40" cy="152" r="9" fill="#34D399" />
      <circle cx="160" cy="152" r="9" fill="#34D399" />
      {/* bayangan */}
      <ellipse cx="100" cy="169" rx="74" ry="4" fill="#7F1D1D" opacity="0.2" />
    </svg>
  );
}
