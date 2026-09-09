import { Platform } from "react-native";
import Constants from "expo-constants";
import { resolveCommunityUrl } from "../logic/endpoints";
import { Level } from "../types";
import { SharedProgress, SharedRoutine } from "../logic/sharing";

function configuredCommunityUrl() { try { return resolveCommunityUrl(
  process.env.EXPO_PUBLIC_COMMUNITY_URL,
  Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : undefined,
  __DEV__ ? Constants.expoConfig?.hostUri?.split(":")[0] : undefined,
  !__DEV__ && Constants.expoConfig?.extra?.communityLocalTest !== true,
); } catch { return ""; } }
export const communityUrl = configuredCommunityUrl();
export interface CommunityUser { id: string; handle: string; name: string; bio: string; avatar?: string; level: Level; posts: number; followers: number; following: number; followed: boolean; routineId?: string | null; progressVisible?: boolean; routinePublic?: boolean; progressPublic?: boolean }
export interface CommunityPost { id: string; userId: string; handle: string; name: string; caption: string; created: string; likes: number; liked: boolean }
export interface PostPage { posts: CommunityPost[]; next: number | null }
export interface PublishedRoutine { id: string; owner: Pick<CommunityUser, "handle" | "name">; routine: SharedRoutine; updated: string }
export type PublishedProgress = SharedProgress;
export class CommunityError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function communityRequest<T>(path: string, token?: string, method = "GET", data?: unknown): Promise<T> {
  if (!communityUrl) throw new CommunityError(0, "Comunidad todavía no está disponible en esta versión. Puedes crear tu rutina y registrar entrenamientos sin conexión.");
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
