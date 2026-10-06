/**
 * Sarathi's privacy promises, in plain words. Every line here must stay TRUE of the app; change the
 * product before changing a promise. Avoid absolute claims like "never leaked" or "100% secure".
 */
export const PRIVACY_PROMISES: { title: string; text: string }[] = [
  { title: "Only you can see your conversations", text: "Not other users, and no one at Sarathi browses them." },
  { title: "Never sold, never used for ads", text: "Sarathi has no ads and doesn't sell or share your data for marketing." },
  { title: "Never used to train AI", text: "What you write is used only to reply to you, not to train AI models." },
  { title: "Protected", text: "Encrypted on the way to our servers and while stored." },
  { title: "You're in control", text: "Delete any conversation, any memory note, or your whole account, any time." },
  { title: "Guests leave no trace with us", text: "If you don't sign in, your conversations stay in your browser, not on our servers." },
];

export const MEMORY_PROMISE =
  "Sarathi remembers what matters so it can help you better, and you decide what it keeps. It stays between you and Sarathi.";
