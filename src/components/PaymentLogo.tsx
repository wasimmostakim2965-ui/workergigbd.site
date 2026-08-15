interface PaymentLogoProps {
  method: 'bkash' | 'nagad' | 'rocket';
  className?: string;
}

// Vector-style logos matching each brand's official colors & typography.
// bKash = pink (#E2136E), Nagad = orange (#EE1C25 / #F7941D), Rocket = purple (#8C3494)
export function PaymentLogo({ method, className = 'h-8' }: PaymentLogoProps) {
  if (method === 'bkash') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 ${className}`}
        style={{ backgroundColor: '#E2136E' }}
      >
        <span className="font-bold text-white leading-none" style={{ fontSize: '1rem', letterSpacing: '-0.02em' }}>
          b<span style={{ fontWeight: 400 }}>Kash</span>
        </span>
      </div>
    );
  }

  if (method === 'nagad') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 ${className}`}
        style={{ backgroundColor: '#EE1C25' }}
      >
        <span className="font-extrabold text-white leading-none italic" style={{ fontSize: '1rem', letterSpacing: '0.02em' }}>
          Nagad
        </span>
      </div>
    );
  }

  // rocket
  return (
    <div
      className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 ${className}`}
      style={{ backgroundColor: '#8C3494' }}
    >
      <span className="font-bold text-white leading-none" style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}>
        Rocket
      </span>
    </div>
  );
}
