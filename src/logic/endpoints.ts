export function resolveCommunityUrl(configured: string | undefined, webOrigin?: string, developmentHost?: string): string {
  if (configured?.trim()) {
    const url = new URL(configured.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error("La dirección de Comunidad debe ser una URL HTTP(S) sin credenciales ni parámetros.");
    }
    return url.toString().replace(/\/$/, "");
  }
  if (webOrigin) {
    const url = new URL(webOrigin);
    url.port = "8082";
    return url.origin;
  }
  if (developmentHost) return `http://${developmentHost}:8082`;
  return "";
}

export function routineShareUrl(id: string, webUrl: string | undefined, nativeUrl: string): string {
  if (!webUrl?.trim()) return nativeUrl;
  const url = new URL(webUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("La dirección pública de la app debe usar HTTPS.");
  url.pathname = `${url.pathname.replace(/\/$/, "")}/shared-routine`;
  url.search = "";
  url.hash = "";
  url.searchParams.set("id", id);
  return url.toString();
}
