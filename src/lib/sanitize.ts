/**
 * Very basic sanitization to strip script/iframe tags while allowing safe text.
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
}

/**
 * Neutralize active content in a user-uploaded SVG. SVGs are served same-origin,
 * so an embedded <script> would be stored-XSS if opened directly. Strips
 * <script>/<foreignObject>, inline on*-event handlers, and javascript: URLs.
 * Not a full SVG sanitizer, but removes the common execution vectors (and SVGs
 * are only ever rendered via <img>, which can't run script anyway).
 */
export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string") return "";
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}
