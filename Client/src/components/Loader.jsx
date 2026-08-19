import React from 'react';

/**
 * Universal Luxury Loader Component for Billu Bazaar
 * Can be used inline across pages, cards, modals, and buttons.
 *
 * @param {string} [size='md'] - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} [color='#C9A24B'] - Primary gold color hex
 * @param {string} [text=''] - Optional status caption below spinner
 * @param {string} [className=''] - Additional CSS classes
 */
const Loader = ({
  size = 'md',
  color = '#C9A24B',
  text = '',
  className = ''
}) => {
  const sizeMap = {
    sm: { container: 'w-8 h-8', svg: 'w-8 h-8', logo: 'w-4 h-4', text: 'text-[10px]' },
    md: { container: 'w-16 h-16', svg: 'w-16 h-16', logo: 'w-8 h-8', text: 'text-xs' },
    lg: { container: 'w-24 h-24', svg: 'w-24 h-24', logo: 'w-12 h-12', text: 'text-sm' },
    xl: { container: 'w-36 h-36', svg: 'w-36 h-36', logo: 'w-16 h-16', text: 'text-base' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-label="Loading">
      <div className={`relative flex items-center justify-center ${currentSize.container}`}>
        {/* Outer Orbit Rotating Spinner */}
        <svg
          className={`${currentSize.svg} animate-orbit`}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle background track */}
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="currentColor"
            strokeWidth="2"
            className="text-neutral-200/50 dark:text-neutral-800"
          />
          {/* Animated Gold Arc */}
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="65 180"
          />
        </svg>

        {/* Inner Counter-Rotating Orbit Arc */}
        <svg
          className={`absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] animate-orbit-reverse opacity-75`}
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="35 150"
            opacity="0.8"
          />
        </svg>

        {/* Center Golden Brand Emblem */}
        <div className={`absolute z-10 flex items-center justify-center ${currentSize.logo}`}>
          <img
            src="/logo.png"
            alt="Billu Bazaar"
            className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(201,162,75,0.4)]"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Optional Caption */}
      {text && (
        <span
          className={`font-medium tracking-widest text-neutral-500 uppercase ${currentSize.text}`}
          style={{ fontFamily: '"Montserrat", sans-serif' }}
        >
          {text}
        </span>
      )}
    </div>
  );
};

export default Loader;
