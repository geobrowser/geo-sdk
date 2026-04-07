/**
 * Strips markdown syntax and returns the first 20 characters for use as the comment name.
 */
export function deriveCommentName(content: string): string {
  const stripped = content
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/__(.+?)__/g, '$1') // bold (underscore)
    .replace(/_(.+?)_/g, '$1') // italic (underscore)
    .replace(/~~(.+?)~~/g, '$1') // strikethrough
    .replace(/`(.+?)`/g, '$1') // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '') // images
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^[-*+]\s+/gm, '') // unordered lists
    .replace(/^\d+\.\s+/gm, '') // ordered lists
    .replace(/---/g, '') // horizontal rules
    .replace(/\n+/g, ' ') // newlines to spaces
    .trim();

  return stripped.slice(0, 20);
}
