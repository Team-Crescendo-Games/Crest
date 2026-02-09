// Custom emojis from public/emojis library

export interface EmojiDefinition {
  id: string;
  src: string;
  label: string;
}

export const AVAILABLE_EMOJIS: EmojiDefinition[] = [
  { id: "FeelingYes", src: "/emojis/FeelingYes.jpg", label: "Yes" },
  { id: "FeelingGreat", src: "/emojis/FeelingGreat.jpg", label: "Great" },
  { id: "FeelingCelebratory", src: "/emojis/FeelingCelebratory.jpg", label: "Celebratory" },
  { id: "FeelingCaffeinated", src: "/emojis/FeelingCaffeinated.jpg", label: "Caffeinated" },
  { id: "FeelingSad", src: "/emojis/FeelingSad.jpg", label: "Sad" },
  { id: "FeelingMad", src: "/emojis/FeelingMad.jpg", label: "Mad" },
  { id: "FeelingSlay", src: "/emojis/FeelingSlay.jpg", label: "Slay" },
  { id: "FeelingMagical", src: "/emojis/FeelingMagical.jpg", label: "Magical" },
  { id: "FeedlingInconceivablySad", src: "/emojis/FeedlingInconceivablySad.jpg", label: "Inconceivably Sad" },
  { id: "FeelingBleachyKeen", src: "/emojis/FeelingBleachyKeen.jpg", label: "Bleachy Keen" },
  { id: "FeelingChonkedUp", src: "/emojis/FeelingChonkedUp.jpg", label: "Chonked Up" },
  { id: "FeelingChrisYearsOld", src: "/emojis/FeelingChrisYearsOld.jpg", label: "Chris Years Old" },
  { id: "FeelingColeYearsOld", src: "/emojis/FeelingColeYearsOld.jpg", label: "Cole Years Old" },
  { id: "FeelingDead", src: "/emojis/FeelingDead.jpg", label: "Dead" },
  { id: "FeelingFurryGuilt", src: "/emojis/FeelingFurryGuilt.jpg", label: "Furry Guilt" },
  { id: "FeelingHamsterHaha", src: "/emojis/FeelingHamsterHaha.jpg", label: "Hamster Haha" },
  { id: "FeelingHamsterHappy", src: "/emojis/FeelingHamsterHappy.jpg", label: "Hamster Happy" },
  { id: "FeelingHamsterHumiliated", src: "/emojis/FeelingHamsterHumiliated.jpg", label: "Hamster Humiliated" },
  { id: "FeelingHankYearsOld", src: "/emojis/FeelingHankYearsOld.png", label: "Hank Years Old" },
  { id: "FeelingLesbianAnguish", src: "/emojis/FeelingLesbianAnguish.jpg", label: "Lesbian Anguish" },
  { id: "FeelingLittleStupid", src: "/emojis/FeelingLittleStupid.jpg", label: "Little Stupid" },
  { id: "FeelingMarkYearsOld", src: "/emojis/FeelingMarkYearsOld.jpg", label: "Mark Years Old" },
  { id: "FeelingMildlyDisappointed", src: "/emojis/FeelingMildlyDisappointed.jpg", label: "Mildly Disappointed" },
  { id: "FeelingRed", src: "/emojis/FeelingRed.jpg", label: "Red" },
  { id: "FeelingShady", src: "/emojis/FeelingShady.jpg", label: "Shady" },
  { id: "FeelingSleepy", src: "/emojis/FeelingSleepy.png", label: "Sleepy" },
  { id: "FeelingSubmissive", src: "/emojis/FeelingSubmissive.jpg", label: "Submissive" },
  { id: "FeelingYappy", src: "/emojis/FeelingYappy.jpg", label: "Yappy" },
];

export const EMOJI_MAP: Record<string, { src: string; label: string }> = 
  Object.fromEntries(AVAILABLE_EMOJIS.map(e => [e.id, { src: e.src, label: e.label }]));

export const VALID_EMOJI_IDS = AVAILABLE_EMOJIS.map(e => e.id);

export const DEFAULT_QUICK_REACTION = "FeelingYes";

export function isValidEmoji(emojiId: string): boolean {
  return VALID_EMOJI_IDS.includes(emojiId);
}

export function getEmojiSrc(emojiId: string): string | null {
  return EMOJI_MAP[emojiId]?.src ?? null;
}

export function getEmojiLabel(emojiId: string): string | null {
  return EMOJI_MAP[emojiId]?.label ?? null;
}
