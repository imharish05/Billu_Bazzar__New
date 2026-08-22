export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('blob:')
  ) {
    return imagePath;
  }
  const cleanPath = imagePath.replace(/^\/+/, '');
  const serverUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (serverUrl) {
    return `${serverUrl}/${cleanPath}`;
  }
  return `/${cleanPath}`;
};

