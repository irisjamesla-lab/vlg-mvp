"use client";

/* eslint-disable @next/next/no-img-element -- Avatars are local privacy SVGs, so Next image optimization is not needed here. */
import React, { useEffect, useState } from "react";

type VLGProfile = {
  id: string;
  name: string;
  neighborhood: string;
  values: string[];
  kidsAges: number[];
  availability: string[];
  preferredDates: string[];
  everydayMoments: string[];
  bio: string;
  membership: "Bronze" | "Silver" | "Gold";
  safetyVerified: boolean;
  avatar: string;
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

const AVATAR_PALETTES: AvatarPalette[] = [
  {
    background: "#fef3c7",
    hair: "#7c2d12",
    top: "#0f766e",
    accent: "#f59e0b",
    skin: "#f2c6a0",
  },
  {
    background: "#e0f2fe",
    hair: "#1e293b",
    top: "#2563eb",
    accent: "#38bdf8",
    skin: "#d8a47f",
  },
  {
    background: "#fce7f3",
    hair: "#581c87",
    top: "#be185d",
    accent: "#f472b6",
    skin: "#8d5524",
  },
  {
    background: "#dcfce7",
    hair: "#3f2a1d",
    top: "#15803d",
    accent: "#84cc16",
    skin: "#c68642",
  },
  {
    background: "#ede9fe",
    hair: "#312e81",
    top: "#7c3aed",
    accent: "#a78bfa",
    skin: "#e0ac69",
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

  const accent = colorFromRgb(
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count),
  );

  return {
    background: adjustColor(accent, 72),
    hair: adjustColor(accent, -68),
    top: adjustColor(accent, -28),
    accent,
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

const SEED_PROFILES: VLGProfile[] = [
  {
    id: "p1",
    name: "Ava",
    neighborhood: "Sherman Oaks",
    values: ["screen-light", "outdoors"],
    kidsAges: [5, 8],
    availability: ["Sun AM", "Wed PM"],
    preferredDates: ["Open park"],
    everydayMoments: [
      "Costco run",
      "Coffee between activities",
      "Walk while kids play",
      "Park bench hang",
    ],
    bio: "Love parks and fresh air.",
    membership: "Silver",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Ava"),
  },
  {
    id: "p2",
    name: "Maya",
    neighborhood: "Granada Hills",
    values: ["gentle parenting", "low-sugar"],
    kidsAges: [10],
    availability: ["Tue PM"],
    preferredDates: ["Library"],
    everydayMoments: [
      "Library hour",
      "Coffee between activities",
      "After-school snack",
      "Errand buddy",
    ],
    bio: "STEM mom.",
    membership: "Gold",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Maya"),
  },
  {
    id: "p3",
    name: "Jordan",
    neighborhood: "Studio City",
    values: ["inclusive", "creative play"],
    kidsAges: [6, 9],
    availability: ["Sat AM", "Thu PM"],
    preferredDates: ["Museum", "Farmer's market"],
    everydayMoments: [
      "Target wander",
      "Farmers market",
      "Park bench hang",
      "Mom-only coffee",
    ],
    bio: "Big on curiosity and low-pressure hangouts.",
    membership: "Gold",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Jordan"),
  },
  {
    id: "p4",
    name: "Leila",
    neighborhood: "North Hollywood",
    values: ["routine", "kindness"],
    kidsAges: [4],
    availability: ["Mon PM", "Fri AM"],
    preferredDates: ["Play cafe", "Picnic"],
    everydayMoments: [
      "Target wander",
      "Errand buddy",
      "Workout class nearby",
      "Coffee between activities",
    ],
    bio: "Looking for weekday mom friends nearby.",
    membership: "Bronze",
    safetyVerified: false,
    avatar: createPrivacyAvatar("Leila"),
  },
  {
    id: "p5",
    name: "Sonia",
    neighborhood: "Burbank",
    values: ["no-pressure plans", "outdoors"],
    kidsAges: [7, 11],
    availability: ["Sun PM", "Wed PM"],
    preferredDates: ["Hiking trail", "Board game cafe"],
    everydayMoments: [
      "Walk while kids play",
      "Run club / sports wait",
      "Farmers market",
      "After-school snack",
    ],
    bio: "Two energetic kids, always up for easy weekend plans.",
    membership: "Silver",
    safetyVerified: true,
    avatar: createPrivacyAvatar("Sonia"),
  },
];

const DEFAULT_ME: VLGProfile = {
  id: "me",
  name: "Iris",
  neighborhood: "Northridge",
  values: ["outdoors"],
  kidsAges: [10],
  availability: ["Sun AM"],
  preferredDates: ["Park"],
  everydayMoments: [
    "Target wander",
    "Coffee between activities",
    "Walk while kids play",
    "Park bench hang",
    "Mom-only coffee",
  ],
  bio: "Single mom",
  membership: "Bronze",
  safetyVerified: false,
  avatar: createPrivacyAvatar("Iris"),
};

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
};

function cloneProfile(profile: VLGProfile): VLGProfile {
  return {
    ...profile,
    values: [...profile.values],
    kidsAges: [...profile.kidsAges],
    availability: [...profile.availability],
    preferredDates: [...profile.preferredDates],
    everydayMoments: [...profile.everydayMoments],
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
  const availability = profile?.availability ?? base.availability;
  const preferredDates = profile?.preferredDates ?? base.preferredDates;
  const everydayMoments = profile?.everydayMoments ?? base.everydayMoments;
  const avatar = isPrivacyAvatar(profile?.avatar) ? profile.avatar : base.avatar;

  return {
    ...base,
    ...profile,
    values: [...values],
    kidsAges: [...kidsAges],
    availability: [...availability],
    preferredDates: [...preferredDates],
    everydayMoments: [...everydayMoments],
    avatar,
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
    score += 0.4;
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
    sharedValues.length > 0 ? "Similar parenting values" : "",
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
    setMe(cloneProfile(DEFAULT_ME));
  }

  async function handleAvatarPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const photo = event.target.files?.[0];
    event.target.value = "";

    if (!photo || !me) return;

    if (!photo.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }

    if (photo.size > 8 * 1024 * 1024) {
      setAvatarError("Please choose a photo under 8 MB.");
      return;
    }

    setIsGeneratingAvatar(true);
    setAvatarError(null);
    setAvatarMessage("Creating a private avatar on this device...");

    try {
      const avatar = await LOCAL_PRIVACY_AVATAR_PLUGIN.generateAvatar({
        photo,
        displayName: me.name,
      });
      setMe((currentProfile) =>
        currentProfile ? { ...currentProfile, avatar } : currentProfile,
      );
      setAvatarMessage(
        "Privacy avatar created. The original photo was not uploaded or saved.",
      );
    } catch (error) {
      setAvatarError(
        error instanceof Error
          ? error.message
          : "Could not create a privacy avatar from that photo.",
      );
      setAvatarMessage("Use a private avatar instead of real mom or kid photos.");
    } finally {
      setIsGeneratingAvatar(false);
    }
  }

  function resetMyAvatar() {
    setMe((currentProfile) =>
      currentProfile
        ? { ...currentProfile, avatar: createPrivacyAvatar(currentProfile.name) }
        : currentProfile,
    );
    setAvatarError(null);
    setAvatarMessage("Reset to a generated privacy avatar.");
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
  }

  if (!me) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        <h1 className="text-3xl font-bold mb-3">VLG Setup</h1>
        <p className="text-neutral-300 mb-6">
          Find your mom circle without the awkward small talk.
        </p>

        <button
          className="bg-white text-black px-5 py-3 rounded-xl font-semibold"
          onClick={startApp}
        >
          Start
        </button>
      </main>
    );
  }

  const current = queue[0];
  const matchSummary = current ? calculateMatchSummary(me, current) : null;

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">VLG</h1>
            <p className="text-neutral-400">Mom Match MVP</p>
            <p className="text-xs text-neutral-500 mt-1">
              {queue.length} profiles left
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="text-sm border border-neutral-700 px-3 py-2 rounded-lg disabled:opacity-40"
              onClick={rewindLastSwipe}
              disabled={history.length === 0}
            >
              Rewind
            </button>
            <button
              className="text-sm border border-neutral-700 px-3 py-2 rounded-lg"
              onClick={resetApp}
            >
              Reset
            </button>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              src={me.avatar}
              alt={`${me.name} privacy avatar`}
              className="h-20 w-20 rounded-2xl bg-neutral-800"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200">
                {LOCAL_PRIVACY_AVATAR_PLUGIN.name}
              </p>
              <h2 className="text-lg font-bold">Create a private avatar</h2>
              <p className="mt-1 text-sm text-neutral-300">
                {LOCAL_PRIVACY_AVATAR_PLUGIN.description}
              </p>
              <p className="mt-2 text-sm text-neutral-400">{avatarMessage}</p>
              {avatarError ? (
                <p className="mt-2 text-sm text-red-300">{avatarError}</p>
              ) : null}
            </div>
            <div className="grid gap-2 sm:w-44">
              <label className="cursor-pointer rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarPhotoChange}
                  disabled={isGeneratingAvatar}
                />
                {isGeneratingAvatar ? "Creating..." : "Use photo"}
              </label>
              <button
                className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-200 disabled:opacity-50"
                onClick={resetMyAvatar}
                disabled={isGeneratingAvatar}
              >
                Reset avatar
              </button>
            </div>
          </div>
        </section>

        {current ? (
          <section className="bg-white text-black rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={current.avatar}
                  alt={`${current.name} avatar`}
                  className="w-20 h-20 rounded-2xl sm:w-24 sm:h-24"
                />
                <div>
                  <h2 className="text-2xl font-bold">{current.name}</h2>
                  <p className="text-neutral-600">{current.neighborhood}</p>
                </div>
              </div>

              {matchSummary ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:max-w-56">
                  <p className="text-3xl font-black text-amber-900">
                    {matchSummary.percentage}%
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    village match
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-amber-950">
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
                  className="text-xs bg-neutral-100 border px-3 py-1 rounded-full"
                >
                  {value}
                </span>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
                Everyday overlap
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {matchSummary?.sharedEverydayMoments.length ? (
                  matchSummary.sharedEverydayMoments.map((moment) => (
                    <span
                      key={moment}
                      className="rounded-full bg-white border border-neutral-200 px-3 py-1 text-sm font-medium"
                    >
                      {moment}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">
                    No exact everyday overlap yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="border border-neutral-300 px-5 py-3 rounded-xl font-medium"
                onClick={() => swipeCurrent("pass")}
              >
                Pass
              </button>
              <button
                className="bg-black text-white px-5 py-3 rounded-xl font-medium"
                onClick={() => swipeCurrent("like")}
              >
                Like
              </button>
            </div>
          </section>
        ) : (
          <section className="bg-white text-black rounded-2xl p-5 space-y-5">
            <h2 className="text-xl font-bold">No more profiles</h2>
            <p className="text-neutral-600 mt-2">
              Reset the demo to start again.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-neutral-200 p-3">
                <p className="text-2xl font-bold">{likes.length}</p>
                <p className="text-xs text-neutral-500">Likes</p>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <p className="text-2xl font-bold">{passes.length}</p>
                <p className="text-xs text-neutral-500">Passes</p>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <p className="text-2xl font-bold">{matches.length}</p>
                <p className="text-xs text-neutral-500">Matches</p>
              </div>
            </div>

            {matches.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                  Matches
                </h3>
                <ul className="space-y-2">
                  {matches.map((profile) => (
                    <li
                      key={profile.id}
                      className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"
                    >
                      <img
                        src={profile.avatar}
                        alt={`${profile.name} avatar`}
                        className="w-10 h-10 rounded-lg"
                      />
                      <div>
                        <p className="font-medium">{profile.name}</p>
                        <p className="text-sm text-neutral-500">
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