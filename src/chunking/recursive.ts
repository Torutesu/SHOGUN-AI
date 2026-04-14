export interface ChunkOptions {
  maxChunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

const DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""];
const DEFAULT_MAX_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 100;

export function recursiveChunk(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const maxSize = options.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const overlap = options.chunkOverlap ?? DEFAULT_OVERLAP;
  const separators = options.separators ?? DEFAULT_SEPARATORS;

  if (text.length <= maxSize) {
    return text.trim() ? [text.trim()] : [];
  }

  return splitRecursive(text, separators, maxSize, overlap);
}

function splitRecursive(
  text: string,
  separators: string[],
  maxSize: number,
  overlap: number
): string[] {
  if (text.length <= maxSize) {
    return text.trim() ? [text.trim()] : [];
  }

  const separator = findBestSeparator(text, separators);
  if (separator === "") {
    // Hard split at maxSize
    return hardSplit(text, maxSize, overlap);
  }

  const parts = text.split(separator);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const part of parts) {
    const candidate = currentChunk
      ? currentChunk + separator + part
      : part;

    if (candidate.length <= maxSize) {
      currentChunk = candidate;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      if (part.length > maxSize) {
        const remainingSeparators = separators.slice(
          separators.indexOf(separator) + 1
        );
        const subChunks = splitRecursive(
          part,
          remainingSeparators,
          maxSize,
          overlap
        );
        chunks.push(...subChunks);
        currentChunk = "";
      } else {
        // Start new chunk with overlap from previous
        if (chunks.length > 0 && overlap > 0) {
          const prevChunk = chunks[chunks.length - 1];
          const overlapText = prevChunk.slice(-overlap);
          currentChunk = overlapText + separator + part;
          if (currentChunk.length > maxSize) {
            currentChunk = part;
          }
        } else {
          currentChunk = part;
        }
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function findBestSeparator(text: string, separators: string[]): string {
  for (const sep of separators) {
    if (sep === "" || text.includes(sep)) {
      return sep;
    }
  }
  return "";
}

function hardSplit(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    start = end - overlap;
    if (start >= text.length - overlap) break;
  }

  // Catch any remaining text
  if (start < text.length) {
    const remaining = text.slice(start).trim();
    if (remaining && remaining !== chunks[chunks.length - 1]) {
      chunks.push(remaining);
    }
  }

  return chunks;
}
