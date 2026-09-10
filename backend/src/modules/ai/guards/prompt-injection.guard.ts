/**
 * Customer text and retrieved documents are data, never instructions.
 *
 * The real defence is architectural — the model cannot call a tool it was not
 * given, widen a retrieval scope injected from the run context, or write a
 * field outside the allow-list. This adds two cheap, honest layers on top:
 * the content is fenced inside a tag the model is told to treat as data, and
 * any fence-closing sequence inside the content itself is neutralised so a
 * customer cannot break out of it.
 */
const FENCE_BREAKERS = /<\/?(?:customer_message|knowledge|system|instructions)[^>]*>/gi;

export const fenceUntrusted = (tag: string, content: string): string => {
  const neutralised = content.replace(FENCE_BREAKERS, (match) =>
    match.replace(/[<>]/g, ''),
  );
  return `<${tag}>\n${neutralised}\n</${tag}>`;
};

/** Phrases worth recording when they appear — for observability, not blocking. */
const SUSPICIOUS =
  /(ignore (all )?(previous|prior|above)|disregard .{0,20}instructions|system prompt|أنت الآن|تجاهل التعليمات)/i;

export const looksLikeInjection = (content: string): boolean =>
  SUSPICIOUS.test(content);
