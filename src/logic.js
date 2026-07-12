export const CATEGORIES = [
  { value: "romantic",    label: "Romantic 🌹" },
  { value: "playful",     label: "Playful 😄" },
  { value: "adventurous", label: "Adventurous 🌶️" },
  { value: "intimate",    label: "Intimate 💫" },
  { value: "other",       label: "Other ✨" },
];

export function validateItem(title) {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return { valid: false, trimmed: "" };
  if (trimmed.length > 200) return { valid: false, trimmed };
  return { valid: true, trimmed };
}

export function categoryLabel(value) {
  return CATEGORIES.find(c => c.value === value)?.label ?? value;
}

export function randomUntried(items) {
  const untried = items.filter(i => !i.tried_at);
  if (!untried.length) return null;
  return untried[Math.floor(Math.random() * untried.length)];
}

export function averageRating(items) {
  const rated = items.filter(i => i.tried_at && i.rating != null);
  if (!rated.length) return null;
  return rated.reduce((sum, i) => sum + i.rating, 0) / rated.length;
}
