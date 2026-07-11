import { UserCircle } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export type AuthorInfo = {
  name?: string | null;
  avatarUrl?: string | null;
  isAnonymous?: boolean | null;
  isCurrentUser?: boolean;
  publishedAt?: string | null;
  prefix?: string;
};

export function publicAuthorName(author?: AuthorInfo | null) {
  if (author?.isCurrentUser) return "Publicado por mí";
  if (author?.isAnonymous) return "Miembro de la comunidad";
  return author?.name?.trim() ? `Publicado por ${author.name.trim()}` : "Publicado por la comunidad";
}

export function AuthorBadge({ author, compact = false }: { author?: AuthorInfo | null; compact?: boolean }) {
  const label = publicAuthorName(author);
  const meta = author?.publishedAt ? timeAgo(author.publishedAt) : author?.isAnonymous ? "Identidad protegida" : "Información pública";

  return (
    <div className={`author-badge ${compact ? "author-badge-compact" : ""}`}>
      {author?.avatarUrl && !author.isAnonymous ? (
        <img src={author.avatarUrl} alt={label} className="author-avatar" loading="lazy" />
      ) : (
        <span className="author-avatar author-avatar-empty"><UserCircle size={compact ? 17 : 22} /></span>
      )}
      <span>
        <strong>{author?.prefix ? `${author.prefix} ${label.replace(/^Publicado por /, "")}` : label}</strong>
        <small>{meta}</small>
      </span>
    </div>
  );
}
