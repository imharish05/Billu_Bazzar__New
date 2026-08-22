import { RotateCcw } from 'lucide-react';
import Product360Fallback from './Product360Fallback';

/**
 * Product360Viewer
 * Directs rendering to Product360Fallback, which provides high-fidelity,
 * fully customizable 360° spin controls and adjustable speeds.
 */
const SERVER_URL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000').replace(/\/$/, '');

const getFullImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return `${SERVER_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const Product360Viewer = ({ product, onClose }) => {
  const spinImages = Array.isArray(product?.spin_images) ? product.spin_images : [];
  const count = product?.spinImageCount || 0;
  const path = product?.spinImagePath;
  const ext = product?.spinImageExt || 'jpg';

  const hasMaterializedSequence = count >= 2 && !!path;

  if (!hasMaterializedSequence && spinImages.length <= 1) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 relative bg-neutral-50">
        <div className="absolute top-4 left-4 bg-brand-gold/10 text-brand-gold text-[10px] font-bold px-2.5 py-1 tracking-wider uppercase flex items-center gap-1.5 rounded-full border border-brand-gold/20 z-10">
          <RotateCcw size={10} /> 360° Unavailable
        </div>
        <svg className="w-16 h-16 text-brand-gold/60" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <polygon points="12,2 22,8.5 12,22 2,8.5" />
        </svg>
        <p className="text-[10px] text-brand-grey uppercase tracking-widest mt-4 font-medium text-center">
          No 360° frame set uploaded for this product yet
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute bottom-4 right-4 bg-white hover:bg-neutral-50 text-brand-text text-xs px-3 py-1.5 rounded-full shadow border border-neutral-200 font-medium flex items-center gap-1 z-10"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  const rawImages = spinImages.length ? spinImages : buildFrameUrls(path, count, ext);
  const images = rawImages.map(img => getFullImageUrl(img));

  return (
    <Product360Fallback
      images={images}
      productName={product?.name}
      onClose={onClose}
    />
  );
};

const buildFrameUrls = (path, count, ext) => {
  const cleanPath = path.endsWith('/') ? path : `${path}/`;
  return Array.from({ length: count }, (_, i) => `${cleanPath}frame_${i + 1}.${ext}`);
};

export default Product360Viewer;