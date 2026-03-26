import { ReactionEmoji, ReactionMap } from "@/lib/types";

export const ALLOWED_REACTION_EMOJIS = ["❤️", "👍", "😋", "👏", "🔥"] as const;

export const REACTION_OPTIONS: ReadonlyArray<{
  emoji: ReactionEmoji;
  key: string;
  label: string;
}> = [
  { emoji: "❤️", key: "heart", label: "좋아요" },
  { emoji: "👍", key: "thumbs-up", label: "엄지" },
  { emoji: "😋", key: "yum", label: "맛있어 보여요" },
  { emoji: "👏", key: "clap", label: "잘했어요" },
  { emoji: "🔥", key: "fire", label: "최고예요" },
];

const reactionEmojiSet = new Set<string>(ALLOWED_REACTION_EMOJIS);

export const isReactionEmoji = (value: string): value is ReactionEmoji =>
  reactionEmojiSet.has(value);

const uniqueTruthyStrings = (values: unknown[]): string[] =>
  Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  );

export const normalizeReactionMap = (raw: unknown): ReactionMap => {
  if (!raw || typeof raw !== "object") return {};

  const rawMap = raw as Record<string, unknown>;
  const normalized: ReactionMap = {};

  REACTION_OPTIONS.forEach(({ emoji }) => {
    const users = rawMap[emoji];
    if (!Array.isArray(users)) return;

    const normalizedUsers = uniqueTruthyStrings(users);
    if (normalizedUsers.length === 0) return;
    normalized[emoji] = normalizedUsers;
  });

  return normalized;
};

export const toggleReactionInMap = (
  reactions: ReactionMap,
  emoji: ReactionEmoji,
  uid: string
): ReactionMap => {
  const current = normalizeReactionMap(reactions);
  const nextUsers = new Set(current[emoji] ?? []);

  if (nextUsers.has(uid)) {
    nextUsers.delete(uid);
  } else {
    nextUsers.add(uid);
  }

  const next: ReactionMap = { ...current };
  const serializedUsers = Array.from(nextUsers);

  if (serializedUsers.length === 0) {
    delete next[emoji];
    return next;
  }

  next[emoji] = serializedUsers;
  return next;
};

export const getReactionCount = (reactions: ReactionMap, emoji: ReactionEmoji): number =>
  normalizeReactionMap(reactions)[emoji]?.length ?? 0;

export const hasUserReacted = (
  reactions: ReactionMap,
  emoji: ReactionEmoji,
  uid: string | null | undefined
): boolean => {
  if (!uid) return false;
  return (normalizeReactionMap(reactions)[emoji] ?? []).includes(uid);
};
