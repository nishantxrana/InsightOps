/** SSR-safe Apple platform detection for shortcut labels. */
export function isApplePlatform() {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}
