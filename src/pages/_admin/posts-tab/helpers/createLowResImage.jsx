

export async function createLowResImage(file, maxSize=300) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onLoad = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

      const width = img.width * scale;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.7
      );

      URL.revokeObjectURL(url);
    };

    img.src = url;
  });
}