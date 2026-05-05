"use client";

import React, { useEffect, useState } from "react";

type VLGProfile = {
  id: string;
  name: string;
  neighborhood: string;
  values: string[];
  kidsAges: number[];
  availability: string[];
  preferredDates: string[];
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

const SEED_PROFILES: VLGProfile[] = [
  {
    id: "p1",
    name: "Ava",
    neighborhood: "Sherman Oaks",
    values: ["screen-light", "outdoors"],
    kidsAges: [5, 8],
    availability: ["Sun AM", "Wed PM"],
    preferredDates: ["Open park"],
    bio: "Love parks and fresh air.",
    membership: "Silver",
    safetyVerified: true,
    avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=Ava",
  },
  {
    id: "p2",
    name: "Maya",
    neighborhood: "Granada Hills",
    values: ["gentle parenting", "low-sugar"],
    kidsAges: [10],
    availability: ["Tue PM"],
    preferredDates: ["Library"],
    bio: "STEM mom.",
    membership: "Gold",
    safetyVerified: true,
    avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=Maya",
  },
  {
    id: "p3",
    name: "Jordan",
    neighborhood: "Studio City",
    values: ["inclusive", "creative play"],
    kidsAges: [6, 9],
    availability: ["Sat AM", "Thu PM"],
    preferredDates: ["Museum", "Farmer's market"],
    bio: "Big on curiosity and low-pressure hangouts.",
    membership: "Gold",
    safetyVerified: true,
    avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=Jordan",
  },
  {
    id: "p4",
    name: "Leila",
    neighborhood: "North Hollywood",
    values: ["routine", "kindness"],
    kidsAges: [4],
    availability: ["Mon PM", "Fri AM"],
    preferredDates: ["Play cafe", "Picnic"],
    bio: "Looking for weekday mom friends nearby.",
    membership: "Bronze",
    safetyVerified: false,
    avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=Leila",
  },
  {
    id: "p5",
    name: "Sonia",
    neighborhood: "Burbank",
    values: ["no-pressure plans", "outdoors"],
    kidsAges: [7, 11],
    availability: ["Sun PM", "Wed PM"],
    preferredDates: ["Hiking trail", "Board game cafe"],
    bio: "Two energetic kids, always up for easy weekend plans.",
    membership: "Silver",
    safetyVerified: true,
    avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=Sonia",
  },
];

export default function Page() {
  const [me, setMe] = useState<VLGProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("me");
    return saved ? JSON.parse(saved) : null;
  });
  const [queue, setQueue] = useState<VLGProfile[]>(() => {
    if (typeof window === "undefined") return SEED_PROFILES;
    const saved = localStorage.getItem("queue");
    return saved ? JSON.parse(saved) : SEED_PROFILES;
  });
  const [likes, setLikes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("likes");
    return saved ? JSON.parse(saved) : [];
  });
  const [passes, setPasses] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("passes");
    return saved ? JSON.parse(saved) : [];
  });
  const [matches, setMatches] = useState<VLGProfile[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("matches");
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<SwipeHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("history");
    return saved ? JSON.parse(saved) : [];
  });

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
    setMe({
      id: "me",
      name: "Iris",
      neighborhood: "Northridge",
      values: ["outdoors"],
      kidsAges: [10],
      availability: ["Sun AM"],
      preferredDates: ["Park"],
      bio: "Single mom",
      membership: "Bronze",
      safetyVerified: false,
      avatar: "https://api.dicebear.com/9.x/thumbs/svg?seed=Iris",
    });
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
    setQueue(SEED_PROFILES);
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

        {current ? (
          <section className="bg-white text-black rounded-2xl p-5 shadow-lg">
            <img
              src={current.avatar}
              alt={`${current.name} avatar`}
              className="w-24 h-24 rounded-2xl mb-4"
            />

            <h2 className="text-2xl font-bold">{current.name}</h2>
            <p className="text-neutral-600">{current.neighborhood}</p>
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