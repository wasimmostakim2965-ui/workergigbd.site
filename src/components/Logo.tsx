interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export function Logo({ size = 40, showText = true, textColor = 'text-primary-700' }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-md"
        style={{ width: size, height: size }}
      >
        <img
          src="/logo.png"
          alt="WORKER GIG BD logo"
          className="object-contain"
          style={{ maxHeight: '100%', maxWidth: '100%' }}
        />
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
