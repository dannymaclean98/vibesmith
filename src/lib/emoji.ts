// Check if a string is an emoji (or contains only emojis)
export function isEmoji(str: string): boolean {
  // If it starts with ~ it's a sticker reference
  if (str.startsWith('~')) return false;

  // Emoji regex pattern - matches most common emojis
  const emojiRegex =
    /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\u200d\ufe0f]+$/u;

  // Also check if it's a short string (emojis are usually 1-4 chars visually)
  // Long strings are likely sticker names or text
  if (str.length > 20) return false;

  return emojiRegex.test(str);
}

