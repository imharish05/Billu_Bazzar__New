export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  const serverUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (serverUrl) {
    return `${serverUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  }
  return imagePath;
};
