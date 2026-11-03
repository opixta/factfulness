import type { Stance } from "@/scoring/types";

export interface Topic {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  participants: number;
  updatedAt: string;
}

export interface Claim {
  id: string;
  text: string;
  reason?: string;
  votesTrue: number;
  votesFalse: number;
  /** Local-only: current user's vote for this claim */
  userVote?: "true" | "false";
}

export interface Evidence {
  id: string;
  title: string;
  url: string;
  stance: Stance;
  summary: string;
  trust: number;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  vote?: "" | "true" | "false";
  at: string;
}

export interface AppData {
  topics: Topic[];
  claims: Record<string, Claim[]>;
  evidence: Record<string, Evidence[]>;
  comments: Record<string, Comment[]>;
}

export const STORAGE_KEY = "@factfulness/app-data-v1";
