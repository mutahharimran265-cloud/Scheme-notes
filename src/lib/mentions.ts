// @mentions in comment bodies. A mention is "@" immediately followed by a full
// email address, e.g. "@alex@example.com". We keep it email-based (not @name)
// so a mention is unambiguous and actually notifiable.

// Not preceded by a word char / [ / ( / / so we don't re-linkify an already
// linked mention or match a plain email that has no leading "@".
const MENTION_RE =
  /(^|[^\w[(/])@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

/** Unique, lower-cased emails mentioned in a comment body (capped). */
export function extractMentionEmails(body: string): string[] {
  if (typeof body !== "string") return [];
  const out: string[] = [];
  for (const m of body.matchAll(MENTION_RE)) {
    const email = m[2].toLowerCase();
    if (!out.includes(email)) out.push(email);
    if (out.length >= 10) break;
  }
  return out;
}

/**
 * Turn "@alex@example.com" into a markdown mailto link so it renders as a
 * highlighted, clickable mention. Safe to run before react-markdown: it only
 * rewrites bare mentions, leaving existing links/code alone.
 */
export function linkifyMentions(body: string): string {
  if (typeof body !== "string") return "";
  return body.replace(MENTION_RE, (_full, pre, email) => `${pre}[@${email}](mailto:${email})`);
}
