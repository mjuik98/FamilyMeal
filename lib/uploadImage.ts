import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Compress and resize an image before upload.
 * Max width: 1200px, quality: 0.7
 */
const compressImage = (dataUri: string, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context unavailable'));

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Blob creation failed'));
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = dataUri;
    });
};

/**
 * Upload an image to Firebase Storage.
 * Compresses the image first if it's a base64 data URI.
 * Returns the public download URL.
 */
export const uploadImage = async (
    imageData: string | File,
    path?: string
): Promise<string> => {
    const filename = path || `meals/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const storageRef = ref(storage, filename);

    let blob: Blob;

    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        // Compress base64 data URI
        blob = await compressImage(imageData);
    } else if (typeof imageData === 'string') {
        const response = await fetch(imageData);
        blob = await response.blob();
    } else {
        blob = imageData;
    }

    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
};
