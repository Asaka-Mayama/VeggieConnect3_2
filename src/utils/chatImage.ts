// Chat photo attachment helper: compresses any picked image file into a
// bandwidth-friendly JPEG data URL so chat photos survive localStorage,
// the in-memory API store and the XAMPP MySQL `data` LONGTEXT column
// without bloating the payload.

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.72;

/**
 * Reads an image File, downscales it so the longest edge is at most
 * `maxDimension` pixels and returns a JPEG data URL. Photos larger than the
 * cap are proportionally shrunk; smaller photos keep their size.
 */
export function fileToChatPhotoDataUrl(
  file: File,
  maxDimension: number = MAX_DIMENSION,
  quality: number = JPEG_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load the selected image.'));
      img.onload = () => {
        try {
          const { width, height } = img;
          const scale = Math.min(1, maxDimension / Math.max(width, height));
          const targetW = Math.max(1, Math.round(width * scale));
          const targetH = Math.max(1, Math.round(height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Canvas unavailable (very old browser) — fall back to the raw file.
            resolve(rawUrl);
            return;
          }
          // White matte so transparent PNGs do not turn black in JPEG.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(new Error('Could not process the selected image.'));
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

/** True when a message carries a photo attachment. */
export function hasChatPhoto(msg: { imageUrl?: string } | null | undefined): boolean {
  return Boolean(msg && msg.imageUrl && typeof msg.imageUrl === 'string' && msg.imageUrl.startsWith('data:image'));
}

/** Short chat-list preview for a message that may be photo-only. */
export function chatPhotoPreviewText(text?: string): string {
  return text && text.trim() ? text : '📷 Photo';
}

// Emoji palette shared by the community chat (farmer/buyer) and the admin desk
// chat. Faces, reactions and produce/logistics icons cover the everyday
// VeggieConnect conversations (harvests, pickups, payments, greetings).
export const CHAT_EMOJIS: string[] = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋',
  '😎', '🤩', '🥳', '🤗', '🤔', '🤨', '😐', '😴',
  '😢', '😭', '😤', '😠', '🤯', '🥺', '😰', '🤝',
  '👍', '👎', '👏', '🙏', '💪', '✌️', '👌', '🤙',
  '❤️', '💚', '💛', '✨', '⭐', '🔥', '🎉', '✅',
  '❌', '⚠️', '📞', '💰', '🛒', '🚚', '📦', '🌱',
  '🌿', '🍅', '🥕', '🥬', '🥦', '🌽', '🥔', '🍆',
  '🌶️', '🥒', '🧅', '🧄', '🥗', '🍎', '🥭', '🍇',
];
