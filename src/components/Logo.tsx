interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export function Logo({ size = 40, showText = true, textColor = 'text-primary-700' }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-md"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[70%] w-[70%]"
        >
          <path
            d="M18 32 L18 72 L30 72 L30 52 L44 52 L44 72 L56 72 L56 32 L44 32 L44 44 L30 44 L30 32 Z"
            fill="white"
          />
          <circle cx="72" cy="30" r="12" fill="#fbbf24" />
          <path
            d="M67 30 L70 33 L77 26"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M62 52 L82 52 L82 72 L62 72 Z"
            fill="white"
            fillOpacity="0.85"
          />
          <path
            d="M67 57 L77 57 M67 62 L74 62"
            stroke="#0f766e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-heading text-base font-extrabold tracking-tight ${textColor}`}>
            WORKER GIG
          </span>
          <span className="text-[10px] font-bold tracking-widest text-accent-500">
            BD
          </span>
        </div>
      )}
    </div>
  );
}
