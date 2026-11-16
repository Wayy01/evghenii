import type { ReactNode } from "react";

// Post bodies are written in the admin as light markdown. They are parsed to
// React elements here, so nothing a post contains is ever injected as HTML.

const safeHref = (href: string) => (/^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(href) ? href : null);

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      out.push(<strong key={match.index}>{match[1]}</strong>);
    } else {
      const href = safeHref(match[3]);
      const external = href?.startsWith("http");
      out.push(
        href ? (
          <a key={match.index} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
            {match[2]}
          </a>
        ) : (
          match[2]
        ),
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { type: "h2" | "p"; text: string } | { type: "ul"; items: string[] };

function parse(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    if (list.length) blocks.push({ type: "ul", items: list });
    paragraph = [];
    list = [];
  };

  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      list.push(line.slice(2).trim());
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function Prose({ body }: { body: string }) {
  return (
    <div className="prose-post max-w-[68ch]">
      {parse(body).map((block, i) =>
        block.type === "h2" ? (
          <h2 key={i}>{inline(block.text)}</h2>
        ) : block.type === "ul" ? (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(block.text)}</p>
        ),
      )}
    </div>
  );
}
