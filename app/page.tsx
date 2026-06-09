"use client";

/* eslint-disable @next/next/no-img-element -- Avatars are local privacy SVGs, so Next image optimization is not needed here. */
import React, { useEffect, useState } from "react";

type VLGProfile = {
  id: string;
  name: string;
  neighborhood: string;
  values: string[];
  kidsAges: number[];
  supportNeeds: string[];
  supportNeedsNotes: string;
  availability: string[];
  preferredDates: string[];
  everydayMoments: string[];
  dietaryNeeds: string[];
  dietaryNotes: string;
  bio: string;
  membership: "Bronze" | "Silver" | "Gold";
  safetyVerified: boolean;
  avatar: string;
  childAvatar: string;
};

type Swipe = "like" | "pass";
type SwipeHistoryEntry = {
  profile: VLGProfile;
  direction: Swipe;
  createdMatch: boolean;
};

type AvatarPalette = {
  background: string;
  hair: string;
  top: string;
  accent: string;
  skin: string;
};

type AvatarPluginInput = {
  photo: File;
  displayName: string;
};

type AvatarPlugin = {
  id: string;
  name: string;
  description: string;
  generateAvatar(input: AvatarPluginInput): Promise<string>;
};

type CalendarSetupPlugin = {
  id: string;
  name: string;
  description: string;
};

type SetupProfileForm = {
  name: string;
  neighborhood: string;
  kidsAgesText: string;
  bio: string;
  supportNeeds: string[];
  supportNeedsNotes: string;
  values: string[];
  preferredDates: string[];
  everydayMoments: string[];
  availability: string[];
  dietaryNeeds: string[];
  dietaryNotes: string;
  avatar: string;
  childAvatar: string;
};

type SetupAvatarTarget = "child" | "mom";

type SetupMultiSelectField =
  | "availability"
  | "dietaryNeeds"
  | "everydayMoments"
  | "preferredDates"
  | "supportNeeds"
  | "values";

const AVATAR_PALETTES: AvatarPalette[] = [
  {
    background: "#fbf4e8",
    hair: "#21160d",
    top: "#8f6f32",
    accent: "#d7b46a",
    skin: "#d9a875",
  },
  {
    background: "#fffaf0",
    hair: "#3a2a18",
    top: "#15110d",
    accent: "#caa45d",
    skin: "#c68642",
  },
  {
    background: "#f4ead7",
    hair: "#17120d",
    top: "#b58a3b",
    accent: "#efe0bd",
    skin: "#8d5524",
  },
  {
    background: "#f8f1e4",
    hair: "#2c2014",
    top: "#5d4525",
    accent: "#d8bd7a",
    skin: "#e0ac69",
  },
  {
    background: "#fffdf8",
    hair: "#0f0c09",
    top: "#a88445",
    accent: "#f1d99b",
    skin: "#f2c6a0",
  },
];

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colorFromRgb(red: number, green: number, blue: number) {
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function adjustColor(hexColor: string, amount: number) {
  const normalized = hexColor.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16) + amount;
  const green = parseInt(normalized.slice(2, 4), 16) + amount;
  const blue = parseInt(normalized.slice(4, 6), 16) + amount;

  return colorFromRgb(red, green, blue);
}

function initialsForName(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "V";
}

function createPrivacyAvatar(
  name: string,
  paletteOverride: Partial<AvatarPalette> = {},
) {
  const hash = hashString(name);
  const basePalette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const palette = { ...basePalette, ...paletteOverride };
  const smilePath =
    hash % 2 === 0 ? "M82 126 Q96 137 110 126" : "M82 127 Q96 134 110 127";
  const hairPath =
    hash % 3 === 0
      ? "M52 94 Q58 48 98 47 Q138 48 144 94 Q126 78 98 80 Q70 78 52 94"
      : "M55 90 Q66 50 98 48 Q130 50 141 90 Q124 68 98 72 Q72 68 55 90";
  const escapedName = escapeSvgText(name);
  const escapedInitials = escapeSvgText(initialsForName(name));
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-labelledby="title">
  <title id="title">Privacy avatar for ${escapedName}</title>
  <rect width="192" height="192" rx="42" fill="${palette.background}"/>
  <circle cx="154" cy="42" r="22" fill="${palette.accent}" opacity="0.38"/>
  <circle cx="38" cy="148" r="28" fill="${palette.accent}" opacity="0.24"/>
  <path d="M54 165 Q96 136 138 165 Z" fill="${palette.top}"/>
  <circle cx="96" cy="98" r="45" fill="${palette.skin}"/>
  <path d="${hairPath}" fill="${palette.hair}"/>
  <circle cx="80" cy="103" r="5" fill="#171717"/>
  <circle cx="112" cy="103" r="5" fill="#171717"/>
  <path d="${smilePath}" fill="none" stroke="#171717" stroke-width="5" stroke-linecap="round"/>
  <text x="96" y="178" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#ffffff">${escapedInitials}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isPrivacyAvatar(avatar?: string): avatar is string {
  return avatar?.startsWith("data:image/svg+xml") ?? false;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that photo."));
    };
    image.src = objectUrl;
  });
}

async function extractPaletteFromPhoto(file: File): Promise<Partial<AvatarPalette>> {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const sampleSize = 32;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Your browser could not create a privacy avatar.");
  }

  context.drawImage(image, 0, 0, sampleSize, sampleSize);
  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3];
    if (alpha < 128) continue;

    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    count += 1;
  }

  if (count === 0) {
    throw new Error("That photo did not have enough visible color to sample.");
  }

  const luminance =
    (Math.round(red / count) * 0.299 +
      Math.round(green / count) * 0.587 +
      Math.round(blue / count) * 0.114) /
    255;
  const palette = AVATAR_PALETTES[
    Math.min(
      AVATAR_PALETTES.length - 1,
      Math.floor(luminance * AVATAR_PALETTES.length),
    )
  ];

  return {
    ...palette,
    background: adjustColor(palette.background, luminance > 0.55 ? 8 : -8),
    accent: luminance > 0.55 ? "#f1d99b" : "#caa45d",
  };
}

const LOCAL_PRIVACY_AVATAR_PLUGIN: AvatarPlugin = {
  id: "local-privacy-avatar",
  name: "AI privacy avatar",
  description:
    "Creates a non-real avatar from photo colors in the browser. The original photo is never uploaded or saved.",
  async generateAvatar({ photo, displayName }) {
    const palette = await extractPaletteFromPhoto(photo);
    return createPrivacyAvatar(displayName, palette);
  },
};

function validateAvatarPhoto(photo: File) {
  if (!photo.type.startsWith("image/")) {
    return "Please choose an image file.";
  }

  if (photo.size > 8 * 1024 * 1024) {
    return "Please choose a photo under 8 MB.";
  }

  return null;
}

const LOCAL_CALENDAR_SETUP_PLUGIN: CalendarSetupPlugin = {
  id: "local-prime-time-calendar",
  name: "Calendar setup",
  description:
    "Pick the real days and times you are most open to hangouts. This stays on your device and powers match scoring.",
};

const NEIGHBORHOOD_OPTIONS = [
  "Burbank",
  "Granada Hills",
  "North Hollywood",
  "Northridge",
  "Sherman Oaks",
  "Studio City",
];

const VALUE_OPTIONS = [
  "outdoors",
  "gentle parenting",
  "low-sugar",
  "screen-light",
  "inclusive",
  "creative play",
  "routine",
  "kindness",
  "no-pressure plans",
];

const PLAYDATE_STYLE_OPTIONS = [
  "Park",
  "Open park",
  "Library",
  "Museum",
  "Farmer's market",
  "Play cafe",
  "Picnic",
  "Hiking trail",
  "Board game cafe",
];

const EVERYDAY_MOMENT_OPTIONS = [
  "Costco run",
  "Target wander",
  "Coffee between activities",
  "Walk while kids play",
  "Park bench hang",
  "Run club / sports wait",
  "Farmers market",
  "Library hour",
  "After-school snack",
  "Errand buddy",
  "Workout class nearby",
  "Mom-only coffee",
];

const DIETARY_NEED_OPTIONS = [
  "No major restrictions",
  "Allergy-aware snacks",
  "Nut-free friendly",
  "Dairy-free friendly",
  "Gluten-free friendly",
  "Low-sugar preferred",
  "Vegetarian snacks",
  "Vegan snacks",
  "Halal-friendly",
  "Kosher-friendly",
  "Bring our own snacks",
  "Ask before sharing food",
];

const SUPPORT_NEED_OPTIONS = [
  "No special accommodations",
  "Autism-friendly",
  "ADHD-friendly",
  "Sensory-sensitive spaces",
  "Speech/development support",
  "OT/PT-friendly play",
  "Mobility-accessible spots",
  "Medical needs awareness",
  "Anxiety/shy kid support",
  "Low-stimulation hangouts",
  "Flexible timing / short visits",
  "Predictable plans",
  "Caregiver-to-caregiver check-in",
];

const PRIME_HANGOUT_OPTIONS = [
  "Mon AM",
  "Mon PM",
  "Tue AM",
  "Tue PM",
  "Wed AM",
  "Wed PM",
  "Thu AM",
  "Thu PM",
  "Fri AM",
  "Fri PM",
  "Sat AM",
  "Sat PM",
  "Sun AM",
  "Sun PM",
];

const SEED_PROFILES: VLGProfile[] = [
  {
    id: "p1",
    name: "Ava",
    neighborhood: "Sherman Oaks",
    values: ["screen-light", "outdoors"],
    kidsAges: [5, 8],
    supportNeeds: [
      "Sensory-sensitive spaces",
      "Low-stimulation hangouts",
      "Flexible timing / short visits",
    ],
    supportNeedsNotes:
      "One kid does best with quieter parks and a short heads-up before plans change.",
    availability: ["Sun AM", "Wed PM"],
    preferredDates: ["Open park"],
    everydayMoments: [
      "Costco run",
      "Coffee between activities",
      "Walk while kids play",
      "Park bench hang",
    ],
    dietaryNeeds: ["Nut-free friendly", "Bring our own snacks"],
    dietaryNotes:
      "Nut-free snacks are easiest. We are happy to bring our own food to park hangs.",
    bio: "Love parks and fresh air.",
    membership: "Silver",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Ava"),
    childAvatar: createPrivacyAvatar("Ava kids"),
  },
  {
    id: "p2",
    name: "Maya",
    neighborhood: "Granada Hills",
    values: ["gentle parenting", "low-sugar"],
    kidsAges: [10],
    supportNeeds: [
      "No special accommodations",
      "Predictable plans",
      "Caregiver-to-caregiver check-in",
    ],
    supportNeedsNotes:
      "No formal accommodations right now, but predictable plans help everyone.",
    availability: ["Tue PM"],
    preferredDates: ["Library"],
    everydayMoments: [
      "Library hour",
      "Coffee between activities",
      "After-school snack",
      "Errand buddy",
    ],
    dietaryNeeds: ["Low-sugar preferred", "Dairy-free friendly"],
    dietaryNotes:
      "Low-sugar snacks help our afternoons go better. Dairy-free options are appreciated.",
    bio: "STEM mom.",
    membership: "Gold",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Maya"),
    childAvatar: createPrivacyAvatar("Maya kid"),
  },
  {
    id: "p3",
    name: "Jordan",
    neighborhood: "Studio City",
    values: ["inclusive", "creative play"],
    kidsAges: [6, 9],
    supportNeeds: [
      "ADHD-friendly",
      "Flexible timing / short visits",
      "Low-stimulation hangouts",
    ],
    supportNeedsNotes:
      "Short, active plans with room to move are usually the best fit.",
    availability: ["Sat AM", "Thu PM"],
    preferredDates: ["Museum", "Farmer's market"],
    everydayMoments: [
      "Target wander",
      "Farmers market",
      "Park bench hang",
      "Mom-only coffee",
    ],
    dietaryNeeds: ["Vegetarian snacks", "Allergy-aware snacks"],
    dietaryNotes:
      "Vegetarian snacks work best, and I always check before kids share food.",
    bio: "Big on curiosity and low-pressure hangouts.",
    membership: "Gold",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Jordan"),
    childAvatar: createPrivacyAvatar("Jordan kids"),
  },
  {
    id: "p4",
    name: "Leila",
    neighborhood: "North Hollywood",
    values: ["routine", "kindness"],
    kidsAges: [4],
    supportNeeds: [
      "Autism-friendly",
      "Sensory-sensitive spaces",
      "Predictable plans",
    ],
    supportNeedsNotes:
      "We do best with predictable plans, gentle transitions, and quieter spaces.",
    availability: ["Mon PM", "Fri AM"],
    preferredDates: ["Play cafe", "Picnic"],
    everydayMoments: [
      "Target wander",
      "Errand buddy",
      "Workout class nearby",
      "Coffee between activities",
    ],
    dietaryNeeds: ["No major restrictions", "Ask before sharing food"],
    dietaryNotes:
      "No major restrictions, but I prefer checking with parents before snack sharing.",
    bio: "Looking for weekday mom friends nearby.",
    membership: "Bronze",
    safetyVerified: false,
    avatar: createPrivacyAvatar("Leila"),
    childAvatar: createPrivacyAvatar("Leila kid"),
  },
  {
    id: "p5",
    name: "Sonia",
    neighborhood: "Burbank",
    values: ["no-pressure plans", "outdoors"],
    kidsAges: [7, 11],
    supportNeeds: [
      "Anxiety/shy kid support",
      "Caregiver-to-caregiver check-in",
      "Flexible timing / short visits",
    ],
    supportNeedsNotes:
      "A quick parent check-in before meeting helps my shy kid feel more comfortable.",
    availability: ["Sun PM", "Wed PM"],
    preferredDates: ["Hiking trail", "Board game cafe"],
    everydayMoments: [
      "Walk while kids play",
      "Run club / sports wait",
      "Farmers market",
      "After-school snack",
    ],
    dietaryNeeds: ["Gluten-free friendly", "Bring our own snacks"],
    dietaryNotes:
      "One kid does better with gluten-free snacks, so we usually bring our own.",
    bio: "Two energetic kids, always up for easy weekend plans.",
    membership: "Silver",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Sonia"),
    childAvatar: createPrivacyAvatar("Sonia kids"),
  },
];

const DEFAULT_ME: VLGProfile = {
  id: "me",
  name: "Iris",
  neighborhood: "Northridge",
  values: ["outdoors"],
  kidsAges: [10],
  supportNeeds: [
    "Sensory-sensitive spaces",
    "Flexible timing / short visits",
    "Caregiver-to-caregiver check-in",
  ],
  supportNeedsNotes:
    "Quieter outdoor spaces and flexible timing make hangouts easier for us.",
  availability: ["Sun AM"],
  preferredDates: ["Park"],
  everydayMoments: [
    "Target wander",
    "Coffee between activities",
    "Walk while kids play",
    "Park bench hang",
    "Mom-only coffee",
  ],
  dietaryNeeds: ["Allergy-aware snacks", "Bring our own snacks"],
  dietaryNotes:
    "I like allergy-aware snack plans and am comfortable bringing our own food.",
  bio: "Single mom",
  membership: "Bronze",
  safetyVerified: false,
  avatar: createPrivacyAvatar("Iris"),
  childAvatar: createPrivacyAvatar("Iris child"),
};

function createDefaultSetupForm(): SetupProfileForm {
  return {
    name: DEFAULT_ME.name,
    neighborhood: DEFAULT_ME.neighborhood,
    kidsAgesText: DEFAULT_ME.kidsAges.join(", "),
    bio: DEFAULT_ME.bio,
    supportNeeds: [...DEFAULT_ME.supportNeeds],
    supportNeedsNotes: DEFAULT_ME.supportNeedsNotes,
    values: [...DEFAULT_ME.values],
    preferredDates: [...DEFAULT_ME.preferredDates],
    everydayMoments: [...DEFAULT_ME.everydayMoments],
    availability: [...DEFAULT_ME.availability],
    dietaryNeeds: [...DEFAULT_ME.dietaryNeeds],
    dietaryNotes: DEFAULT_ME.dietaryNotes,
    avatar: DEFAULT_ME.avatar,
    childAvatar: DEFAULT_ME.childAvatar,
  };
}

function toggleListItem(items: string[], item: string) {
  return items.includes(item)
    ? items.filter((currentItem) => currentItem !== item)
    : [...items, item];
}

function parseKidsAges(value: string) {
  return value
    .split(",")
    .map((age) => Number.parseInt(age.trim(), 10))
    .filter((age) => Number.isInteger(age) && age > 0 && age < 19);
}

function fallbackToDefault(items: string[], defaultItems: string[]) {
  return items.length > 0 ? items : defaultItems;
}

function createProfileFromSetup(form: SetupProfileForm): VLGProfile {
  const name = form.name.trim() || DEFAULT_ME.name;
  const neighborhood = form.neighborhood || DEFAULT_ME.neighborhood;
  const kidsAges = parseKidsAges(form.kidsAgesText);

  return {
    ...DEFAULT_ME,
    name,
    neighborhood,
    kidsAges: kidsAges.length > 0 ? kidsAges : DEFAULT_ME.kidsAges,
    supportNeeds: fallbackToDefault(form.supportNeeds, DEFAULT_ME.supportNeeds),
    supportNeedsNotes:
      form.supportNeedsNotes.trim() || DEFAULT_ME.supportNeedsNotes,
    availability: fallbackToDefault(form.availability, DEFAULT_ME.availability),
    values: fallbackToDefault(form.values, DEFAULT_ME.values),
    preferredDates: fallbackToDefault(
      form.preferredDates,
      DEFAULT_ME.preferredDates,
    ),
    everydayMoments: fallbackToDefault(
      form.everydayMoments,
      DEFAULT_ME.everydayMoments,
    ),
    dietaryNeeds: fallbackToDefault(form.dietaryNeeds, DEFAULT_ME.dietaryNeeds),
    dietaryNotes: form.dietaryNotes.trim() || DEFAULT_ME.dietaryNotes,
    bio: form.bio.trim() || DEFAULT_ME.bio,
    avatar: isPrivacyAvatar(form.avatar) ? form.avatar : createPrivacyAvatar(name),
    childAvatar: isPrivacyAvatar(form.childAvatar)
      ? form.childAvatar
      : createPrivacyAvatar(`${name} child`),
  };
}

const SEED_PROFILE_BY_ID = new Map(
  SEED_PROFILES.map((profile) => [profile.id, profile]),
);

const NEARBY_NEIGHBORHOODS: Record<string, string[]> = {
  Northridge: ["Granada Hills"],
  "Granada Hills": ["Northridge"],
  "Sherman Oaks": ["Studio City", "North Hollywood"],
  "Studio City": ["Sherman Oaks", "North Hollywood", "Burbank"],
  "North Hollywood": ["Studio City", "Sherman Oaks", "Burbank"],
  Burbank: ["North Hollywood", "Studio City"],
};

const VALLEY_NEIGHBORHOODS = new Set([
  "Burbank",
  "Granada Hills",
  "North Hollywood",
  "Northridge",
  "Sherman Oaks",
  "Studio City",
]);

type MatchSummary = {
  percentage: number;
  reasons: string[];
  sharedEverydayMoments: string[];
  sharedDietaryNeeds: string[];
  sharedSupportNeeds: string[];
};

function cloneProfile(profile: VLGProfile): VLGProfile {
  return {
    ...profile,
    values: [...profile.values],
    kidsAges: [...profile.kidsAges],
    supportNeeds: [...profile.supportNeeds],
    availability: [...profile.availability],
    preferredDates: [...profile.preferredDates],
    everydayMoments: [...profile.everydayMoments],
    dietaryNeeds: [...profile.dietaryNeeds],
  };
}

function parseStoredValue<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : null;
  } catch {
    return null;
  }
}

function normalizeProfile(
  profile: Partial<VLGProfile> | null | undefined,
  fallback?: VLGProfile,
): VLGProfile {
  const base = fallback ?? DEFAULT_ME;
  const values = profile?.values ?? base.values;
  const kidsAges = profile?.kidsAges ?? base.kidsAges;
  const supportNeeds = profile?.supportNeeds ?? base.supportNeeds;
  const availability = profile?.availability ?? base.availability;
  const preferredDates = profile?.preferredDates ?? base.preferredDates;
  const everydayMoments = profile?.everydayMoments ?? base.everydayMoments;
  const dietaryNeeds = profile?.dietaryNeeds ?? base.dietaryNeeds;
  const avatar = isPrivacyAvatar(profile?.avatar) ? profile.avatar : base.avatar;
  const childAvatar = isPrivacyAvatar(profile?.childAvatar)
    ? profile.childAvatar
    : base.childAvatar;

  return {
    ...base,
    ...profile,
    values: [...values],
    kidsAges: [...kidsAges],
    supportNeeds: [...supportNeeds],
    supportNeedsNotes: profile?.supportNeedsNotes ?? base.supportNeedsNotes,
    availability: [...availability],
    preferredDates: [...preferredDates],
    everydayMoments: [...everydayMoments],
    dietaryNeeds: [...dietaryNeeds],
    dietaryNotes: profile?.dietaryNotes ?? base.dietaryNotes,
    avatar,
    childAvatar,
  };
}

function normalizeProfiles(
  profiles: Partial<VLGProfile>[] | null,
  defaultProfiles: VLGProfile[] = [],
): VLGProfile[] {
  const profilesToNormalize = profiles ?? defaultProfiles;

  return profilesToNormalize.map((profile) =>
    normalizeProfile(profile, SEED_PROFILE_BY_ID.get(profile.id ?? "")),
  );
}

function normalizeHistory(
  history: Partial<SwipeHistoryEntry>[] | null,
): SwipeHistoryEntry[] {
  if (!history) return [];

  return history
    .filter((entry) => entry.profile && entry.direction)
    .map((entry) => ({
      profile: normalizeProfile(
        entry.profile,
        SEED_PROFILE_BY_ID.get(entry.profile?.id ?? ""),
      ),
      direction: entry.direction as Swipe,
      createdMatch: Boolean(entry.createdMatch),
    }));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sharedItems(a: string[], b: string[]) {
  const bValues = new Set(b.map(normalizeText));
  return a.filter((item) => bValues.has(normalizeText(item)));
}

function overlapScore(a: string[], b: string[]) {
  const denominator = Math.min(a.length, b.length);
  if (denominator === 0) return 0;

  return sharedItems(a, b).length / denominator;
}

function tokenize(values: string[]) {
  const stopWords = new Set(["a", "am", "and", "open", "pm", "the", "while"]);

  return values.flatMap((value) =>
    normalizeText(value)
      .split(" ")
      .filter((word) => word && !stopWords.has(word)),
  );
}

function tokenOverlapScore(a: string[], b: string[]) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  return [...aTokens].some((token) => bTokens.has(token)) ? 1 : 0;
}

function childAgeScore(me: VLGProfile, profile: VLGProfile) {
  const ageDifferences = me.kidsAges.flatMap((myAge) =>
    profile.kidsAges.map((theirAge) => Math.abs(myAge - theirAge)),
  );

  if (ageDifferences.length === 0) return 0;

  const closestAgeDifference = Math.min(...ageDifferences);

  if (closestAgeDifference <= 1) return 1;
  if (closestAgeDifference <= 2) return 0.8;
  if (closestAgeDifference <= 3) return 0.6;
  if (closestAgeDifference <= 5) return 0.3;
  return 0;
}

function locationScore(me: VLGProfile, profile: VLGProfile) {
  if (me.neighborhood === profile.neighborhood) return 1;
  if (NEARBY_NEIGHBORHOODS[me.neighborhood]?.includes(profile.neighborhood)) {
    return 0.85;
  }
  if (
    VALLEY_NEIGHBORHOODS.has(me.neighborhood) &&
    VALLEY_NEIGHBORHOODS.has(profile.neighborhood)
  ) {
    return 0.55;
  }

  return 0.2;
}

function hasOutdoorOrPublicPreference(profile: VLGProfile) {
  const signals = [
    ...profile.values,
    ...profile.preferredDates,
    ...profile.everydayMoments,
  ];
  const publicWords = [
    "coffee",
    "farmers",
    "library",
    "market",
    "outdoors",
    "park",
    "picnic",
    "walk",
  ];

  return tokenize(signals).some((token) => publicWords.includes(token));
}

function safetyLifestyleScore(me: VLGProfile, profile: VLGProfile) {
  let score = profile.safetyVerified ? 0.6 : 0;

  if (hasOutdoorOrPublicPreference(me) && hasOutdoorOrPublicPreference(profile)) {
    score += 0.25;
  }

  if (sharedItems(me.dietaryNeeds, profile.dietaryNeeds).length > 0) {
    score += 0.15;
  }

  if (sharedItems(me.supportNeeds, profile.supportNeeds).length > 0) {
    score += 0.15;
  }

  return Math.min(score, 1);
}

function formatAvailability(availability: string) {
  return availability
    .replace("Sun", "Sunday")
    .replace("Mon", "Monday")
    .replace("Tue", "Tuesday")
    .replace("Wed", "Wednesday")
    .replace("Thu", "Thursday")
    .replace("Fri", "Friday")
    .replace("Sat", "Saturday")
    .replace("AM", "morning")
    .replace("PM", "afternoon");
}

function uniqueReasons(reasons: string[]) {
  const fallbacks = [
    "Easy everyday connection windows",
    "Compatible local rhythms",
    "Good low-pressure village potential",
  ];

  return [...new Set([...reasons, ...fallbacks])].slice(0, 3);
}

function calculateMatchSummary(me: VLGProfile, profile: VLGProfile): MatchSummary {
  const sharedAvailability = sharedItems(me.availability, profile.availability);
  const sharedValues = sharedItems(me.values, profile.values);
  const sharedEverydayMoments = sharedItems(
    me.everydayMoments,
    profile.everydayMoments,
  );
  const sharedDietaryNeeds = sharedItems(me.dietaryNeeds, profile.dietaryNeeds);
  const sharedSupportNeeds = sharedItems(me.supportNeeds, profile.supportNeeds);
  const playdateScore = tokenOverlapScore(me.preferredDates, profile.preferredDates);
  const ageScore = childAgeScore(me, profile);
  const localScore = locationScore(me, profile);
  const comfortScore = safetyLifestyleScore(me, profile);

  const percentage = Math.round(
    overlapScore(me.availability, profile.availability) * 25 +
      overlapScore(me.values, profile.values) * 20 +
      ageScore * 15 +
      overlapScore(me.everydayMoments, profile.everydayMoments) * 15 +
      localScore * 10 +
      playdateScore * 10 +
      comfortScore * 5,
  );

  const reasonCandidates = [
    sharedAvailability[0]
      ? `Shared ${formatAvailability(sharedAvailability[0])} availability`
      : "",
    sharedEverydayMoments[0]
      ? `Both open to ${sharedEverydayMoments[0]}`
      : "",
    ageScore >= 0.6 ? "Kids are close in age" : "",
    sharedSupportNeeds[0]
      ? `Shared support fit: ${sharedSupportNeeds[0]}`
      : "",
    sharedValues.length > 0 ? "Similar parenting values" : "",
    sharedDietaryNeeds[0] ? `Shared snack comfort: ${sharedDietaryNeeds[0]}` : "",
    playdateScore > 0 || (hasOutdoorOrPublicPreference(me) && hasOutdoorOrPublicPreference(profile))
      ? "Both prefer outdoor/public meetups"
      : "",
    localScore >= 0.85 ? "Nearby neighborhoods" : "",
    profile.safetyVerified ? "Safety-verified profile" : "",
  ].filter(Boolean);

  return {
    percentage,
    reasons: uniqueReasons(reasonCandidates),
    sharedEverydayMoments,
    sharedDietaryNeeds,
    sharedSupportNeeds,
  };
}

export default function Page() {
  const [me, setMe] = useState<VLGProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = parseStoredValue<Partial<VLGProfile>>("me");
    return saved ? normalizeProfile(saved, DEFAULT_ME) : null;
  });
  const [queue, setQueue] = useState<VLGProfile[]>(() => {
    if (typeof window === "undefined") return SEED_PROFILES;
    return normalizeProfiles(
      parseStoredValue<Partial<VLGProfile>[]>("queue"),
      SEED_PROFILES,
    );
  });
  const [likes, setLikes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return parseStoredValue<string[]>("likes") ?? [];
  });
  const [passes, setPasses] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return parseStoredValue<string[]>("passes") ?? [];
  });
  const [matches, setMatches] = useState<VLGProfile[]>(() => {
    if (typeof window === "undefined") return [];
    return normalizeProfiles(parseStoredValue<Partial<VLGProfile>[]>("matches"));
  });
  const [history, setHistory] = useState<SwipeHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    return normalizeHistory(parseStoredValue<Partial<SwipeHistoryEntry>[]>("history"));
  });
  const [avatarMessage, setAvatarMessage] = useState(
    "Use a private avatar instead of real mom or kid photos.",
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [setupAvatarMessage, setSetupAvatarMessage] = useState(
    "Upload mom and child photos to generate private avatars before matching.",
  );
  const [setupAvatarError, setSetupAvatarError] = useState<string | null>(null);
  const [generatingSetupAvatar, setGeneratingSetupAvatar] =
    useState<SetupAvatarTarget | null>(null);
  const [setupForm, setSetupForm] = useState<SetupProfileForm>(() =>
    createDefaultSetupForm(),
  );
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("me", JSON.stringify(me));
    localStorage.setItem("queue", JSON.stringify(queue));
    localStorage.setItem("likes", JSON.stringify(likes));
    localStorage.setItem("passes", JSON.stringify(passes));
    localStorage.setItem("matches", JSON.stringify(matches));
    localStorage.setItem("history", JSON.stringify(history));
  }, [me, queue, likes, passes, matches, history]);

  function startApp() {
    if (parseKidsAges(setupForm.kidsAgesText).length === 0) {
      setSetupError("Add at least one kid age, like 4 or 4, 7.");
      return;
    }

    if (setupForm.availability.length === 0) {
      setSetupError("Pick at least one prime day and time for hangouts.");
      return;
    }

    setSetupError(null);
    setMe(createProfileFromSetup(setupForm));
  }

  function updateSetupField(
    field:
      | "bio"
      | "dietaryNotes"
      | "kidsAgesText"
      | "name"
      | "neighborhood"
      | "supportNeedsNotes",
    value: string,
  ) {
    setSetupForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function toggleSetupOption(field: SetupMultiSelectField, option: string) {
    setSetupForm((currentForm) => ({
      ...currentForm,
      [field]: toggleListItem(currentForm[field], option),
    }));
  }

  async function handleSetupAvatarPhotoChange(
    target: SetupAvatarTarget,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const photo = event.target.files?.[0];
    event.target.value = "";

    if (!photo) return;

    const validationError = validateAvatarPhoto(photo);
    if (validationError) {
      setSetupAvatarError(validationError);
      return;
    }

    const name = setupForm.name.trim() || DEFAULT_ME.name;
    const displayName = target === "mom" ? name : `${name} child`;
    const label = target === "mom" ? "mom" : "child";

    setGeneratingSetupAvatar(target);
    setSetupAvatarError(null);
    setSetupAvatarMessage(`Generating a private ${label} AI avatar...`);

    try {
      const avatar = await LOCAL_PRIVACY_AVATAR_PLUGIN.generateAvatar({
        photo,
        displayName,
      });
      setSetupForm((currentForm) => ({
        ...currentForm,
        [target === "mom" ? "avatar" : "childAvatar"]: avatar,
      }));
      setSetupAvatarMessage(
        `Private ${label} avatar created. The original photo was not uploaded or saved.`,
      );
    } catch (error) {
      setSetupAvatarError(
        error instanceof Error
          ? error.message
          : `Could not create a private ${label} avatar from that photo.`,
      );
      setSetupAvatarMessage(
        "Upload mom and child photos to generate private avatars before matching.",
      );
    } finally {
      setGeneratingSetupAvatar(null);
    }
  }

  function resetSetupAvatar(target: SetupAvatarTarget) {
    const name = setupForm.name.trim() || DEFAULT_ME.name;
    const avatar =
      target === "mom"
        ? createPrivacyAvatar(name)
        : createPrivacyAvatar(`${name} child`);

    setSetupForm((currentForm) => ({
      ...currentForm,
      [target === "mom" ? "avatar" : "childAvatar"]: avatar,
    }));
    setSetupAvatarError(null);
    setSetupAvatarMessage(
      target === "mom"
        ? "Reset mom profile photo to a generated privacy avatar."
        : "Reset child profile photo to a generated privacy avatar.",
    );
  }

  async function handleAvatarPhotoChange(
    target: SetupAvatarTarget,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const photo = event.target.files?.[0];
    event.target.value = "";

    if (!photo || !me) return;

    const validationError = validateAvatarPhoto(photo);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    const label = target === "mom" ? "mom" : "child";
    setIsGeneratingAvatar(true);
    setAvatarError(null);
    setAvatarMessage(`Creating a private ${label} avatar on this device...`);

    try {
      const avatar = await LOCAL_PRIVACY_AVATAR_PLUGIN.generateAvatar({
        photo,
        displayName: target === "mom" ? me.name : `${me.name} child`,
      });
      setMe((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              [target === "mom" ? "avatar" : "childAvatar"]: avatar,
            }
          : currentProfile,
      );
      setAvatarMessage(
        `Private ${label} avatar created. The original photo was not uploaded or saved.`,
      );
    } catch (error) {
      setAvatarError(
        error instanceof Error
          ? error.message
          : `Could not create a private ${label} avatar from that photo.`,
      );
      setAvatarMessage("Use a private avatar instead of real mom or kid photos.");
    } finally {
      setIsGeneratingAvatar(false);
    }
  }

  function resetMyAvatar(target: SetupAvatarTarget) {
    setMe((currentProfile) =>
      currentProfile
        ? {
            ...currentProfile,
            [target === "mom" ? "avatar" : "childAvatar"]:
              target === "mom"
                ? createPrivacyAvatar(currentProfile.name)
                : createPrivacyAvatar(`${currentProfile.name} child`),
          }
        : currentProfile,
    );
    setAvatarError(null);
    setAvatarMessage(
      target === "mom"
        ? "Reset mom profile photo to a generated privacy avatar."
        : "Reset child profile photo to a generated privacy avatar.",
    );
  }

  function swipeCurrent(direction: Swipe) {
    const current = queue[0];
    if (!current) return;
    const createdMatch =
      direction === "like" &&
      current.safetyVerified &&
      !matches.some((profile) => profile.id === current.id);

    if (direction === "like") {
      setLikes((prev) => [...prev, current.id]);
      // Mock mutual likes so we can demo a match flow.
      if (createdMatch) {
        setMatches((prev) =>
          prev.some((profile) => profile.id === current.id)
            ? prev
            : [...prev, current],
        );
      }
    } else {
      setPasses((prev) => [...prev, current.id]);
    }

    setHistory((prev) => [...prev, { profile: current, direction, createdMatch }]);
    setQueue((prev) => prev.slice(1));
  }

  function rewindLastSwipe() {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;

      setQueue((currentQueue) => [last.profile, ...currentQueue]);

      if (last.direction === "like") {
        setLikes((currentLikes) => {
          const index = currentLikes.lastIndexOf(last.profile.id);
          if (index === -1) return currentLikes;
          return [
            ...currentLikes.slice(0, index),
            ...currentLikes.slice(index + 1),
          ];
        });
      } else {
        setPasses((currentPasses) => {
          const index = currentPasses.lastIndexOf(last.profile.id);
          if (index === -1) return currentPasses;
          return [
            ...currentPasses.slice(0, index),
            ...currentPasses.slice(index + 1),
          ];
        });
      }

      if (last.createdMatch) {
        setMatches((currentMatches) =>
          currentMatches.filter((profile) => profile.id !== last.profile.id),
        );
      }

      return prev.slice(0, -1);
    });
  }

  function resetApp() {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    setMe(null);
    setQueue(SEED_PROFILES.map(cloneProfile));
    setLikes([]);
    setPasses([]);
    setMatches([]);
    setHistory([]);
    setSetupForm(createDefaultSetupForm());
    setSetupError(null);
    setSetupAvatarError(null);
    setSetupAvatarMessage(
      "Upload mom and child photos to generate private avatars before matching.",
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-[#120f0b] text-[#fffaf0] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#d7b46a]">
              Setup quiz
            </p>
            <h1 className="mt-1 text-3xl font-bold">Build your mom village</h1>
            <p className="mt-2 text-[#efe0bd]">
              Tell VLG the everyday rhythms that actually make hangouts possible
              before you start matching.
            </p>
          </div>

          <section className="rounded-2xl border border-[#d7b46a]/40 bg-[#fffaf0] p-5 text-[#1b1712] shadow-lg">
            <h2 className="text-xl font-bold">Your basics</h2>
            <p className="mt-1 text-sm text-[#6f604d]">
              These answers become your local profile. No backend is connected.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Your name
                <input
                  className="rounded-xl border border-[#d7b46a]/50 bg-white px-3 py-3 text-base font-normal"
                  value={setupForm.name}
                  onChange={(event) =>
                    updateSetupField("name", event.target.value)
                  }
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Neighborhood
                <select
                  className="rounded-xl border border-[#d7b46a]/50 bg-white px-3 py-3 text-base font-normal"
                  value={setupForm.neighborhood}
                  onChange={(event) =>
                    updateSetupField("neighborhood", event.target.value)
                  }
                >
                  {NEIGHBORHOOD_OPTIONS.map((neighborhood) => (
                    <option key={neighborhood} value={neighborhood}>
                      {neighborhood}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Kid ages
                <input
                  className="rounded-xl border border-[#d7b46a]/50 bg-white px-3 py-3 text-base font-normal"
                  placeholder="Example: 4, 7"
                  value={setupForm.kidsAgesText}
                  onChange={(event) =>
                    updateSetupField("kidsAgesText", event.target.value)
                  }
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                Short bio
                <textarea
                  className="min-h-24 rounded-xl border border-[#d7b46a]/50 bg-white px-3 py-3 text-base font-normal"
                  value={setupForm.bio}
                  onChange={(event) =>
                    updateSetupField("bio", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7b46a]/40 bg-[#fffaf0] p-5 text-[#1b1712] shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#8f6f32]">
              {LOCAL_PRIVACY_AVATAR_PLUGIN.name}
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Private mom & child profile photos
            </h2>
            <p className="mt-1 text-sm text-[#6f604d]">
              Upload a mother photo and a child or daughter photo. VLG generates
              private AI-style avatars immediately and never saves the real
              photos.
            </p>
            <p className="mt-2 text-sm text-[#6f604d]">{setupAvatarMessage}</p>
            {setupAvatarError ? (
              <p className="mt-2 rounded-xl border border-[#caa45d] bg-[#f4ead7] px-3 py-2 text-sm text-[#3a2a18]">
                {setupAvatarError}
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={setupForm.avatar}
                    alt="Generated mom privacy avatar"
                    className="h-20 w-20 rounded-2xl bg-white"
                  />
                  <div>
                    <h3 className="font-bold">Mom avatar</h3>
                    <p className="text-sm text-[#6f604d]">
                      Created from a mom photo, not the real image.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  <label className="cursor-pointer rounded-xl bg-[#120f0b] px-4 py-3 text-center text-sm font-semibold text-[#fffaf0]">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) =>
                        handleSetupAvatarPhotoChange("mom", event)
                      }
                      disabled={generatingSetupAvatar !== null}
                    />
                    {generatingSetupAvatar === "mom"
                      ? "Generating..."
                      : "Upload mom photo"}
                  </label>
                  <button
                    className="rounded-xl border border-[#d7b46a]/60 px-4 py-3 text-sm font-semibold text-[#3a2a18] disabled:opacity-50"
                    onClick={() => resetSetupAvatar("mom")}
                    disabled={generatingSetupAvatar !== null}
                  >
                    Reset mom avatar
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={setupForm.childAvatar}
                    alt="Generated child privacy avatar"
                    className="h-20 w-20 rounded-2xl bg-white"
                  />
                  <div>
                    <h3 className="font-bold">Child avatar</h3>
                    <p className="text-sm text-[#6f604d]">
                      Use for a daughter or any child profile photo.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  <label className="cursor-pointer rounded-xl bg-[#120f0b] px-4 py-3 text-center text-sm font-semibold text-[#fffaf0]">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) =>
                        handleSetupAvatarPhotoChange("child", event)
                      }
                      disabled={generatingSetupAvatar !== null}
                    />
                    {generatingSetupAvatar === "child"
                      ? "Generating..."
                      : "Upload child photo"}
                  </label>
                  <button
                    className="rounded-xl border border-[#d7b46a]/60 px-4 py-3 text-sm font-semibold text-[#3a2a18] disabled:opacity-50"
                    onClick={() => resetSetupAvatar("child")}
                    disabled={generatingSetupAvatar !== null}
                  >
                    Reset child avatar
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7b46a]/40 bg-[#fffaf0] p-5 text-[#1b1712] shadow-lg">
            <h2 className="text-xl font-bold">
              Kids&apos; support needs & accommodations
            </h2>
            <p className="mt-1 text-sm text-[#6f604d]">
              Share sensory, developmental, mobility, medical, or social
              supports that make hangouts feel welcoming.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUPPORT_NEED_OPTIONS.map((need) => {
                const selected = setupForm.supportNeeds.includes(need);

                return (
                  <button
                    key={need}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      selected
                        ? "border-[#120f0b] bg-[#120f0b] text-[#fffaf0]"
                        : "border-[#d7b46a]/45 bg-[#fbf4e8] text-[#5d4525]"
                    }`}
                    onClick={() => toggleSetupOption("supportNeeds", need)}
                  >
                    {need}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 grid gap-2 text-sm font-semibold">
              Support notes
              <textarea
                className="min-h-24 rounded-xl border border-[#d7b46a]/50 bg-white px-3 py-3 text-base font-normal"
                placeholder="Example: low-stimulation park, short first hangout, visual schedule, accessible parking..."
                value={setupForm.supportNeedsNotes}
                onChange={(event) =>
                  updateSetupField("supportNeedsNotes", event.target.value)
                }
              />
            </label>
          </section>

          <section className="rounded-2xl border border-[#d7b46a]/40 bg-[#fffaf0] p-5 text-[#1b1712] shadow-lg">
            <h2 className="text-xl font-bold">Dietary needs & snack safety</h2>
            <p className="mt-1 text-sm text-[#6f604d]">
              Add allergies, snack rules, and food comfort details before
              matching so hangouts feel safer.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DIETARY_NEED_OPTIONS.map((need) => {
                const selected = setupForm.dietaryNeeds.includes(need);

                return (
                  <button
                    key={need}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      selected
                        ? "border-[#120f0b] bg-[#120f0b] text-[#fffaf0]"
                        : "border-[#d7b46a]/45 bg-[#fbf4e8] text-[#5d4525]"
                    }`}
                    onClick={() => toggleSetupOption("dietaryNeeds", need)}
                  >
                    {need}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 grid gap-2 text-sm font-semibold">
              Detailed dietary notes
              <textarea
                className="min-h-24 rounded-xl border border-[#d7b46a]/50 bg-white px-3 py-3 text-base font-normal"
                placeholder="Example: severe peanut allergy, no shared snacks, okay with packaged gluten-free snacks..."
                value={setupForm.dietaryNotes}
                onChange={(event) =>
                  updateSetupField("dietaryNotes", event.target.value)
                }
              />
            </label>
          </section>

          <section className="rounded-2xl border border-[#caa45d] bg-[#f4ead7] p-5 text-[#1b1712] shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#8f6f32]">
              {LOCAL_CALENDAR_SETUP_PLUGIN.name}
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Prime days and times for hangouts
            </h2>
            <p className="mt-1 text-sm text-[#3a2a18]">
              {LOCAL_CALENDAR_SETUP_PLUGIN.description}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIME_HANGOUT_OPTIONS.map((time) => {
                const selected = setupForm.availability.includes(time);

                return (
                  <button
                    key={time}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                      selected
                        ? "border-[#120f0b] bg-[#120f0b] text-[#fffaf0]"
                        : "border-[#d7b46a]/60 bg-[#fffaf0] text-[#3a2a18]"
                    }`}
                    onClick={() => toggleSetupOption("availability", time)}
                  >
                    {formatAvailability(time)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7b46a]/40 bg-[#fffaf0] p-5 text-[#1b1712] shadow-lg">
            <h2 className="text-xl font-bold">Parenting values</h2>
            <p className="mt-1 text-sm text-[#6f604d]">
              Choose the values that make another mom feel easy to be around.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {VALUE_OPTIONS.map((value) => {
                const selected = setupForm.values.includes(value);

                return (
                  <button
                    key={value}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      selected
                        ? "border-[#120f0b] bg-[#120f0b] text-[#fffaf0]"
                        : "border-[#d7b46a]/40 bg-[#fbf4e8] text-[#5d4525]"
                    }`}
                    onClick={() => toggleSetupOption("values", value)}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7b46a]/40 bg-[#fffaf0] p-5 text-[#1b1712] shadow-lg">
            <h2 className="text-xl font-bold">Everyday moments</h2>
            <p className="mt-1 text-sm text-[#6f604d]">
              Pick the small windows where you would realistically connect.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {EVERYDAY_MOMENT_OPTIONS.map((moment) => {
                const selected = setupForm.everydayMoments.includes(moment);

                return (
                  <button
                    key={moment}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      selected
                        ? "border-[#120f0b] bg-[#120f0b] text-[#fffaf0]"
                        : "border-[#d7b46a]/40 bg-[#fbf4e8] text-[#5d4525]"
                    }`}
                    onClick={() => toggleSetupOption("everydayMoments", moment)}
                  >
                    {moment}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7b46a]/40 bg-[#fffaf0] p-5 text-[#1b1712] shadow-lg">
            <h2 className="text-xl font-bold">Hangout style</h2>
            <p className="mt-1 text-sm text-[#6f604d]">
              These guide playdate style without putting scheduling controls on
              individual cards.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PLAYDATE_STYLE_OPTIONS.map((style) => {
                const selected = setupForm.preferredDates.includes(style);

                return (
                  <button
                    key={style}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      selected
                        ? "border-[#120f0b] bg-[#120f0b] text-[#fffaf0]"
                        : "border-[#d7b46a]/40 bg-[#fbf4e8] text-[#5d4525]"
                    }`}
                    onClick={() => toggleSetupOption("preferredDates", style)}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </section>

          {setupError ? (
            <p className="rounded-xl border border-[#caa45d] bg-[#3a2a18] px-4 py-3 text-sm text-[#fffaf0]">
              {setupError}
            </p>
          ) : null}

          <button
            className="w-full rounded-2xl bg-[#d7b46a] px-5 py-4 text-lg font-bold text-[#120f0b] shadow-lg shadow-black/30"
            onClick={startApp}
          >
            Start matching
          </button>
        </div>
      </main>
    );
  }

  const current = queue[0];
  const matchSummary = current ? calculateMatchSummary(me, current) : null;

  return (
    <main className="min-h-screen bg-[#120f0b] text-[#fffaf0] p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">VLG</h1>
            <p className="text-[#efe0bd]">Mom Match MVP</p>
            <p className="text-xs text-[#d7b46a] mt-1">
              {queue.length} profiles left
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="text-sm border border-[#d7b46a]/50 px-3 py-2 rounded-lg text-[#fffaf0] disabled:opacity-40"
              onClick={rewindLastSwipe}
              disabled={history.length === 0}
            >
              Rewind
            </button>
            <button
              className="text-sm border border-[#d7b46a]/50 px-3 py-2 rounded-lg text-[#fffaf0]"
              onClick={resetApp}
            >
              Reset
            </button>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-[#d7b46a]/35 bg-[#1b1712] p-4 shadow-lg shadow-black/25">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#d7b46a]">
                {LOCAL_PRIVACY_AVATAR_PLUGIN.name}
              </p>
              <h2 className="text-lg font-bold">
                Create private mom & child avatars
              </h2>
              <p className="mt-1 text-sm text-[#efe0bd]">
                {LOCAL_PRIVACY_AVATAR_PLUGIN.description}
              </p>
              <p className="mt-2 text-sm text-[#d8bd7a]">{avatarMessage}</p>
              {avatarError ? (
                <p className="mt-2 text-sm text-[#f1d99b]">{avatarError}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#d7b46a]/35 bg-[#120f0b] p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={me.avatar}
                    alt={`${me.name} mom privacy avatar`}
                    className="h-16 w-16 rounded-2xl bg-[#2c2014]"
                  />
                  <div>
                    <p className="font-semibold">Mom avatar</p>
                    <p className="text-xs text-[#d8bd7a]">
                      Generated from mom photo.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <label className="cursor-pointer rounded-xl bg-[#d7b46a] px-4 py-3 text-center text-sm font-semibold text-[#120f0b]">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => handleAvatarPhotoChange("mom", event)}
                      disabled={isGeneratingAvatar}
                    />
                    {isGeneratingAvatar ? "Creating..." : "Use mom photo"}
                  </label>
                  <button
                    className="rounded-xl border border-[#d7b46a]/50 px-4 py-3 text-sm font-semibold text-[#fffaf0] disabled:opacity-50"
                    onClick={() => resetMyAvatar("mom")}
                    disabled={isGeneratingAvatar}
                  >
                    Reset mom avatar
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#d7b46a]/35 bg-[#120f0b] p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={me.childAvatar}
                    alt={`${me.name} child privacy avatar`}
                    className="h-16 w-16 rounded-2xl bg-[#2c2014]"
                  />
                  <div>
                    <p className="font-semibold">Child avatar</p>
                    <p className="text-xs text-[#d8bd7a]">
                      Generated from child photo.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <label className="cursor-pointer rounded-xl bg-[#d7b46a] px-4 py-3 text-center text-sm font-semibold text-[#120f0b]">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) =>
                        handleAvatarPhotoChange("child", event)
                      }
                      disabled={isGeneratingAvatar}
                    />
                    {isGeneratingAvatar ? "Creating..." : "Use child photo"}
                  </label>
                  <button
                    className="rounded-xl border border-[#d7b46a]/50 px-4 py-3 text-sm font-semibold text-[#fffaf0] disabled:opacity-50"
                    onClick={() => resetMyAvatar("child")}
                    disabled={isGeneratingAvatar}
                  >
                    Reset child avatar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {current ? (
          <>
            <section className="rounded-2xl border border-[#d7b46a]/45 bg-[#fffaf0] text-[#1b1712] p-5 shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    <img
                      src={current.avatar}
                      alt={`${current.name} mom avatar`}
                      className="w-20 h-20 rounded-2xl border-2 border-[#fffaf0] bg-white sm:w-24 sm:h-24"
                    />
                    <img
                      src={current.childAvatar}
                      alt={`${current.name} child avatar`}
                      className="w-20 h-20 rounded-2xl border-2 border-[#fffaf0] bg-white sm:w-24 sm:h-24"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{current.name}</h2>
                    <p className="text-[#6f604d]">{current.neighborhood}</p>
                  </div>
                </div>

                {matchSummary ? (
                  <div className="rounded-2xl bg-[#f4ead7] border border-[#d7b46a] p-4 sm:max-w-56">
                    <p className="text-3xl font-black text-[#5d4525]">
                      {matchSummary.percentage}%
                    </p>
                    <p className="text-sm font-semibold text-[#5d4525]">
                      village match
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-[#3a2a18]">
                      {matchSummary.reasons.map((reason) => (
                        <li key={reason}>- {reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <p className="mt-4">{current.bio}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {current.values.map((value) => (
                  <span
                    key={value}
                    className="text-xs bg-[#fbf4e8] border border-[#d7b46a]/40 px-3 py-1 rounded-full text-[#5d4525]"
                  >
                    {value}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#8f6f32]">
                  Kids&apos; support needs
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {current.supportNeeds.map((need) => (
                    <span
                      key={need}
                      className={`rounded-full border px-3 py-1 text-sm font-medium ${
                        matchSummary?.sharedSupportNeeds.includes(need)
                          ? "border-[#8f6f32] bg-[#f4ead7] text-[#3a2a18]"
                          : "border-[#d7b46a]/45 bg-white text-[#5d4525]"
                      }`}
                    >
                      {need}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-[#6f604d]">
                  {current.supportNeedsNotes}
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#8f6f32]">
                  Dietary needs
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {current.dietaryNeeds.map((need) => (
                    <span
                      key={need}
                      className={`rounded-full border px-3 py-1 text-sm font-medium ${
                        matchSummary?.sharedDietaryNeeds.includes(need)
                          ? "border-[#8f6f32] bg-[#f4ead7] text-[#3a2a18]"
                          : "border-[#d7b46a]/45 bg-white text-[#5d4525]"
                      }`}
                    >
                      {need}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-[#6f604d]">
                  {current.dietaryNotes}
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#8f6f32]">
                  Everyday overlap
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchSummary?.sharedEverydayMoments.length ? (
                    matchSummary.sharedEverydayMoments.map((moment) => (
                      <span
                        key={moment}
                        className="rounded-full bg-white border border-[#d7b46a]/45 px-3 py-1 text-sm font-medium text-[#3a2a18]"
                      >
                        {moment}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-[#6f604d]">
                      No exact everyday overlap yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-4 grid grid-cols-2 gap-4 pb-6">
              <button
                className="rounded-2xl border border-[#d7b46a]/50 bg-[#1b1712] px-5 py-4 font-semibold text-[#fffaf0] shadow-lg"
                onClick={() => swipeCurrent("pass")}
              >
                Pass
              </button>
              <button
                className="rounded-2xl bg-[#d7b46a] px-5 py-4 font-semibold text-[#120f0b] shadow-lg"
                onClick={() => swipeCurrent("like")}
              >
                Like
              </button>
            </div>
          </>
        ) : (
          <section className="rounded-2xl border border-[#d7b46a]/45 bg-[#fffaf0] text-[#1b1712] p-5 space-y-5">
            <h2 className="text-xl font-bold">No more profiles</h2>
            <p className="text-[#6f604d] mt-2">
              Reset the demo to start again.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-3">
                <p className="text-2xl font-bold">{likes.length}</p>
                <p className="text-xs text-[#8f6f32]">Likes</p>
              </div>
              <div className="rounded-xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-3">
                <p className="text-2xl font-bold">{passes.length}</p>
                <p className="text-xs text-[#8f6f32]">Passes</p>
              </div>
              <div className="rounded-xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-3">
                <p className="text-2xl font-bold">{matches.length}</p>
                <p className="text-xs text-[#8f6f32]">Matches</p>
              </div>
            </div>

            {matches.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8f6f32] mb-2">
                  Matches
                </h3>
                <ul className="space-y-2">
                  {matches.map((profile) => (
                    <li
                      key={profile.id}
                      className="flex items-center gap-3 rounded-xl border border-[#d7b46a]/45 bg-[#fbf4e8] p-3"
                    >
                      <img
                        src={profile.avatar}
                        alt={`${profile.name} avatar`}
                        className="w-10 h-10 rounded-lg"
                      />
                      <div>
                        <p className="font-medium">{profile.name}</p>
                        <p className="text-sm text-[#6f604d]">
                          {profile.neighborhood}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}