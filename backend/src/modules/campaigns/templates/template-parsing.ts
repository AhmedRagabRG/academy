import type { MessageTemplateComponent } from '../../inbox/channels/meta-graph.client';

export interface ParsedTemplate {
  headerKind?: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons: Array<Record<string, unknown>>;
}

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

/**
 * The placeholders a template body or header carries, in the order Meta expects
 * them in the `parameters` array.
 *
 * Meta supports two flavours: positional (`{{1}}`) and named (`{{first_name}}`).
 * Positional tokens are ordered numerically rather than by appearance, because
 * a body reading "مرحبًا {{2}}، دفعة {{1}}" still sends parameter 1 first.
 */
export function parsePlaceholders(text: string): string[] {
  const seen: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) {
    const token = match[1];
    if (token && !seen.includes(token)) seen.push(token);
  }
  const numeric = seen.filter((token) => /^\d+$/.test(token));
  if (numeric.length === seen.length)
    return numeric.sort((a, b) => Number(a) - Number(b));
  return seen;
}

/** True when the template uses `{{name}}` rather than `{{1}}` placeholders. */
export function isNamed(tokens: readonly string[]): boolean {
  return tokens.some((token) => !/^\d+$/.test(token));
}

export function parseComponents(
  components: readonly MessageTemplateComponent[],
): ParsedTemplate {
  const parsed: ParsedTemplate = { bodyText: '', buttons: [] };
  for (const component of components) {
    const type = (component.type ?? '').toUpperCase();
    if (type === 'HEADER') {
      parsed.headerKind = (component.format ?? 'TEXT').toUpperCase();
      parsed.headerText = component.text ?? undefined;
    } else if (type === 'BODY') parsed.bodyText = component.text ?? '';
    else if (type === 'FOOTER') parsed.footerText = component.text ?? undefined;
    else if (type === 'BUTTONS') parsed.buttons = component.buttons ?? [];
  }
  return parsed;
}

/** Substitutes resolved values back into the wording, for previews. */
export function renderPreview(
  text: string,
  values: readonly string[],
  tokens: readonly string[],
): string {
  return text.replace(PLACEHOLDER, (whole, token: string) => {
    const index = tokens.indexOf(token);
    const value = index >= 0 ? values[index] : undefined;
    return value && value.length ? value : whole;
  });
}
