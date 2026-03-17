import { useCallback } from "react";
import { saveImage, getImage, deleteImage, StoredImage } from "@/lib/db";
import { generateId } from "@/lib/geo";

export function useImageStorage() {
  const storeImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result as string;
        const image: StoredImage = {
          id: generateId(),
          data,
          name: file.name,
          mimeType: file.type,
          createdAt: Date.now(),
        };
        await saveImage(image);
        resolve(image.id);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const loadImage = useCallback(
    async (id: string): Promise<StoredImage | undefined> => {
      return getImage(id);
    },
    []
  );

  const removeImage = useCallback(async (id: string): Promise<void> => {
    await deleteImage(id);
  }, []);

  return { storeImage, loadImage, removeImage };
}
