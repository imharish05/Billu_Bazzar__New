import { useState } from 'react';
import Loader from '../components/Loader';
import Preloader from '../components/Preloader';
import { Play, Sparkles, RefreshCw } from 'lucide-react';

const LoaderPreviewPage = () => {
  const [showPreloader, setShowPreloader] = useState(false);
  const [activeSize, setActiveSize] = useState('md');
  const [darkTheme, setDarkTheme] = useState(true);

  return (
    <main id="main-content" className="min-h-[85vh] flex flex-col items-center bg-[#FAF8F5] text-neutral-900 py-16 px-4 md:px-8">
      {/* Fullscreen Preloader Modal Trigger */}
      {showPreloader && (
        <Preloader
          key={Date.now()}
          minimumDuration={2000}
          onFinish={() => setShowPreloader(false)}
        />
      )}

      {/* Header */}
      <div className="max-w-3xl text-center space-y-3 mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C9A24B]/10 border border-[#C9A24B]/30 rounded-full text-xs font-semibold text-[#8A6820] uppercase tracking-widest">
          <Sparkles size={13} className="text-[#C9A24B]" />
          Brand Experience
        </span>
        <h1
          className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900"
          style={{ fontFamily: '"Cinzel", Georgia, serif' }}
        >
          Billu Bazaar Luxury Preloader
        </h1>
        <p className="text-neutral-600 text-sm md:text-base font-medium max-w-xl mx-auto" style={{ fontFamily: '"Montserrat", sans-serif' }}>
          Crafted specifically for Billu Bazaar — with ambient obsidian depth, dual gold geometric orbit rings, breathing logo pulse, and liquid progress animations.
        </p>
      </div>

      {/* Interactive Actions Grid */}
      <div className="w-full max-w-4xl space-y-8">
        {/* 1. Fullscreen Preloader Showcase Button */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 p-8 rounded-2xl border border-neutral-800 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-bold text-[#F2D98D]" style={{ fontFamily: '"Cinzel", serif' }}>
              Full-Screen Website Entrance Preloader
            </h3>
            <p className="text-xs md:text-sm text-neutral-400">
              Plays during initial website visit with smooth liquid gold progress & blur fade exit.
            </p>
          </div>
          <button
            onClick={() => setShowPreloader(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#8A6820] via-[#C9A24B] to-[#F2D98D] text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg shadow-[#C9A24B]/20 transition-all active:scale-95 shrink-0"
          >
            <Play size={16} fill="black" />
            Play Fullscreen Preloader
          </button>
        </div>

        {/* 2. Inline Component Loader Variations */}
        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900" style={{ fontFamily: '"Cinzel", serif' }}>
                Universal Inline Loader Component
              </h3>
              <p className="text-xs text-neutral-500">
                Used in product cards, cart updates, checkout processing, and search queries.
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-semibold">
                {['sm', 'md', 'lg', 'xl'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={`px-3 py-1 rounded-md uppercase transition-all ${
                      activeSize === s ? 'bg-black text-white shadow' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setDarkTheme(!darkTheme)}
                className="text-xs font-semibold px-3 py-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                {darkTheme ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>
          </div>

          {/* Loader Preview Stage */}
          <div
            className={`min-h-[260px] rounded-xl flex flex-col items-center justify-center p-8 transition-colors ${
              darkTheme ? 'bg-[#080809] border border-neutral-800' : 'bg-neutral-50 border border-neutral-200'
            }`}
          >
            <Loader
              size={activeSize}
              color="#C9A24B"
              text="Curating Luxury..."
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 pt-2">
            <span>Component: &lt;Loader size="{activeSize}" /&gt;</span>
            <span className="text-[#8A6820]">Gold: #C9A24B</span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoaderPreviewPage;
