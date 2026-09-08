import { Platform } from "react-native";
import { Level } from "../types";
import { SharedProgress, SharedRoutine } from "../logic/sharing";

export const communityUrl = (process.env.EXPO_PUBLIC_COMMUNITY_URL ||
  (Platform.OS === "web" && typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8082` : "http://127.0.0.1:8082")).replace(/\/$/, "");
export interface CommunityUser { id: string; handle: string; name: string; bio: string; avatar?: string; level: Level; posts: number; followers: number; following: number; followed: boolean; routineId?: string | null; progressVisible?: boolean; routinePublic?: boolean; progressPublic?: boolean }
export interface CommunityPost { id: string; userId: string; handle: string; name: string; caption: string; created: string; likes: number; liked: boolean }
export interface PostPage { posts: CommunityPost[]; next: number | null }
export interface PublishedRoutine { id: string; owner: Pick<CommunityUser, "handle" | "name">; routine: SharedRoutine; updated: string }
export type PublishedProgress = SharedProgress;
export class CommunityError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function communityRequest<T>(path: string, token?: string, method = "GET", data?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${communityUrl}${path}`, { method, signal: controller.signal,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new CommunityError(response.status, result.error ?? "No se ha podido completar la operación.");
    return result;
  } catch (error) {
    if (error instanceof CommunityError) throw error;
    throw new CommunityError(0, "No se puede conectar con Comunidad. Comprueba la conexión y que el servidor esté en marcha, y vuelve a intentarlo.");
  } finally { clearTimeout(timeout); }
}
