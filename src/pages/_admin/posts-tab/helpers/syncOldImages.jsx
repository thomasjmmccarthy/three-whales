import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../firebase"; 

export async function createLowResFromUrl(url, maxSize = 300) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const width = img.width * scale;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.7
      );
    };

    img.src = url;
  });
}

export async function migrateLowRes() {
  const snap = await getDocs(collection(db, "posts"));

  for (const d of snap.docs) {
    const post = d.data();
    const gallery = post.gallery || [];

    let updated = false;

    const newGallery = await Promise.all(
      gallery.map(async (img, i) => {
        // Skip if already done
        if (img.lowResUrl) return img;

        try {
          const blob = await createLowResFromUrl(img.url);

          const lowResPath = `posts/${post.uid}/lowres_${i}.jpg`;
          const storageRef = ref(storage, lowResPath);

          await uploadBytes(storageRef, blob);
          const lowResUrl = await getDownloadURL(storageRef);

          updated = true;

          return {
            ...img,
            lowResUrl,
            lowResPath
          };
        } catch (err) {
          console.error("Failed image:", img.url, err);
          return img;
        }
      })
    );

    if (updated) {
      await updateDoc(doc(db, "posts", post.uid), {
        gallery: newGallery
      });
      console.log("Updated post:", post.uid);
    }
  }

  console.log("DONE");
}

migrateLowRes();