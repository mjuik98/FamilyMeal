import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload an image to Firebase Storage from a base64 data URI or File object.
 * Returns the public download URL.
 */
export const uploadImage = async (
    imageData: string | File,
    path?: string
): Promise<string> => {
    const filename = path || `meals/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const storageRef = ref(storage, filename);

    let blob: Blob;

    if (typeof imageData === 'string') {
        // Convert base64 data URI to Blob
        const response = await fetch(imageData);
        blob = await response.blob();
    } else {
        blob = imageData;
    }

    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
};
