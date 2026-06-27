

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: string; // base64
}

export interface InboundEmailPayload {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string | string[]>;
  attachments?: EmailAttachment[];
}

export function normalizeInboundEmail(payload: Record<string, unknown>): InboundEmailPayload | null {
  const from = payload.from;
  const to = payload.to;
  const subject = payload.subject;
  const text = payload.text;

  if (typeof from !== "string" || !from) return null;
  if (!Array.isArray(to) || to.length === 0) return null;
  if (typeof subject !== "string") return null;
  if (typeof text !== "string") return null;

  const attachments: EmailAttachment[] = [];
  if (Array.isArray(payload.attachments)) {
    for (const att of payload.attachments) {
      if (
        typeof att === "object" &&
        att &&
        typeof (att as EmailAttachment).filename === "string" &&
        typeof (att as EmailAttachment).content === "string"
      ) {
        attachments.push(att as EmailAttachment);
      }
    }
  }

  return {
    from,
    to: to.filter((t): t is string => typeof t === "string"),
    subject,
    text,
    html: typeof payload.html === "string" ? payload.html : undefined,
    headers: payload.headers as Record<string, string | string[]> | undefined,
    attachments,
  };
}

export function extractEmailAlias(toAddresses: string[]): string | null {
  for (const address of toAddresses) {
    const lower = address.toLowerCase();
    const localPart = lower.split("@")[0];
    if (!localPart) continue;

    const aliasMatch = localPart.match(/^charges[+-](.+)$/);
    if (aliasMatch) {
      return aliasMatch[1];
    }
  }
  return null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
