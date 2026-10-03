import type { TourStep } from "@/components/Tour";

/** First visit, signed out: a quick look at everything. */
export const GUEST_TOUR: TourStep[] = [
  { target: "topics", title: "Start here", text: "Tap what it's about, or just type in the box below. Sarathi listens first." },
  { target: "styles", title: "How Sarathi answers", text: "Verses explained, Arjuna's story told as a parallel to yours, or plain counsel. Switch any time." },
  { target: "practices", title: "Calm & Reflect", text: "Short breathing practices, and letters for what you're carrying: unsent letters, forgiveness, and laying worries at Krishna's feet." },
  { target: "music", title: "Calming music", text: "Soft music plays in the background. Mute it or change the volume here." },
  { target: "conversations", title: "Your conversations", text: "Past conversations live here, so you can come back to them." },
  { target: "signin", title: "Sign in (free)", text: "With Google: your conversations are saved, Sarathi remembers what matters to you, and it can check in with you the next morning." },
];

/** First time signed in: what accounts add. */
export const MEMBER_TOUR: TourStep[] = [
  { target: "practices", title: "Calm & Reflect", text: "Breathing practices and reflective letters. Letters you choose to keep are saved privately, only for you." },
  {
    target: "conversations",
    title: "Saved for you",
    text: "Your conversations are here. Inside you'll also find \"What Sarathi knows\" (see or delete anything it remembers) and \"Your letters\".",
  },
  {
    title: "Morning check-ins",
    text: "When Sarathi gives you a practice, it can email you the next morning to ask how it went. It always asks first, and you can stop any time.",
  },
];

export const TOUR_KEYS = { guest: "sarathi-tour-guest-v1", member: "sarathi-tour-member-v1" } as const;
export const PRACTICES_SEEN_KEY = "sarathi-seen-practices";
