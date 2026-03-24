export async function createLowResFromUrl(url, maxSize = 300) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const timeout = setTimeout(() => {
      reject(new Error("Image load timeout"));
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const width = img.width * scale;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Blob failed"));
          resolve(blob);
        },
        "image/jpeg",
        0.7
      );
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Image failed to load"));
    };

    img.src = url;
  });
}