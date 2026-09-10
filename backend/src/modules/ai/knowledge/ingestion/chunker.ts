export interface Chunk {
  ordinal: number;
  heading: string | null;
  content: string;
  tokenCount: number;
}

export interface ChunkOptions {
  targetTokens?: number;
  overlapRatio?: number;
}

interface Unit {
  heading: string | null;
  paragraph: number;
  content: string;
}

const DEFAULT_TARGET_TOKENS = 800;
const DEFAULT_OVERLAP_RATIO = 0.15;
// Arabic commonly tokenizes more densely than Latin. chars / 3.5 deliberately
// chooses the conservative side of the ~4 chars/token Latin rule so we do not
// silently under-count Arabic-heavy knowledge sources.
const estimateTokens = (text: string): number => Math.ceil(text.length / 3.5);
const sentenceParts = (paragraph: string): string[] =>
  paragraph.match(/[^.?!؟،]+[.?!؟،]+(?:["'»”\])}]*)|[^.?!؟،]+$/gu) ?? [];

function hardSplit(
  sentence: string,
  heading: string | null,
  paragraph: number,
  targetCharacters: number,
): Unit[] {
  const units: Unit[] = [];
  for (let offset = 0; offset < sentence.length; offset += targetCharacters) {
    units.push({
      heading,
      paragraph,
      content: sentence.slice(offset, offset + targetCharacters).trim(),
    });
  }
  return units.filter((unit) => unit.content.length > 0);
}

function unitsFor(text: string, targetTokens: number): Unit[] {
  const targetCharacters = Math.max(1, Math.floor(targetTokens * 3.5));
  const units: Unit[] = [];
  let heading: string | null = null;
  let paragraph = 0;
  const sections = text.split(/(?=^#{1,6}\s+\S)/gm);

  for (const section of sections) {
    const lines = section.split('\n');
    const headingMatch = lines[0]?.match(/^#{1,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      heading = headingMatch[1].trim();
      lines.shift();
    }
    const paragraphs = lines.join('\n').split(/\n{2,}/);
    for (const rawParagraph of paragraphs) {
      const content = rawParagraph.replace(/\s*\n\s*/g, ' ').trim();
      if (!content) continue;
      paragraph += 1;
      if (estimateTokens(content) <= targetTokens) {
        units.push({ heading, paragraph, content });
        continue;
      }
      for (const rawSentence of sentenceParts(content)) {
        const sentence = rawSentence.trim();
        if (!sentence) continue;
        if (estimateTokens(sentence) <= targetTokens)
          units.push({ heading, paragraph, content: sentence });
        else
          units.push(
            ...hardSplit(sentence, heading, paragraph, targetCharacters),
          );
      }
    }
  }
  return units;
}

const render = (units: Unit[]): string =>
  units
    .map((unit, index) => {
      const previous = units[index - 1];
      return `${index > 0 && previous?.paragraph === unit.paragraph ? ' ' : index > 0 ? '\n\n' : ''}${unit.content}`;
    })
    .join('');

function overlapSuffix(units: Unit[], overlapTokens: number): Unit[] {
  const suffix: Unit[] = [];
  let tokens = 0;
  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index];
    if (!unit) continue;
    const nextTokens = estimateTokens(unit.content);
    if (suffix.length === 0 && nextTokens > overlapTokens) {
      const sentences = sentenceParts(unit.content)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      if (sentences.length <= 1) return [unit];
      const selected: string[] = [];
      let selectedTokens = 0;
      for (
        let sentenceIndex = sentences.length - 1;
        sentenceIndex > 0;
        sentenceIndex -= 1
      ) {
        const sentence = sentences[sentenceIndex];
        if (!sentence) continue;
        selected.unshift(sentence);
        selectedTokens += estimateTokens(sentence);
        if (selectedTokens >= overlapTokens) break;
      }
      return [{ ...unit, content: selected.join(' ') }];
    }
    if (suffix.length > 0 && tokens + nextTokens > overlapTokens) break;
    suffix.unshift(unit);
    tokens += nextTokens;
    if (tokens >= overlapTokens) break;
  }
  // Carrying the entire prior chunk would create a duplicate chunk and can
  // prevent forward progress when the chunk contains one large paragraph.
  return suffix.length === units.length ? [] : suffix;
}

export function chunk(text: string, options: ChunkOptions = {}): Chunk[] {
  const normalized = text.trim();
  if (!normalized) return [];
  const targetTokens = Math.max(
    1,
    options.targetTokens ?? DEFAULT_TARGET_TOKENS,
  );
  const overlapRatio = Math.min(
    0.5,
    Math.max(0, options.overlapRatio ?? DEFAULT_OVERLAP_RATIO),
  );
  const overlapTokens =
    overlapRatio === 0
      ? 0
      : Math.max(1, Math.round(targetTokens * overlapRatio));
  const units = unitsFor(normalized, targetTokens);
  const result: Chunk[] = [];
  let current: Unit[] = [];

  const emit = () => {
    if (!current.length) return;
    const content = render(current);
    result.push({
      ordinal: result.length,
      heading: current[0]?.heading ?? null,
      content,
      tokenCount: estimateTokens(content),
    });
  };

  for (const unit of units) {
    const changesHeading =
      current.length > 0 && current[0]?.heading !== unit.heading;
    const candidate = render([...current, unit]);
    if (
      current.length > 0 &&
      (changesHeading || estimateTokens(candidate) > targetTokens)
    ) {
      emit();
      current =
        changesHeading || overlapTokens === 0
          ? []
          : overlapSuffix(current, overlapTokens);
    }
    current.push(unit);
  }
  emit();
  return result;
}
