/**
 * Deterministic lexicon-based sentiment on the feedback comment plus rating fallback.
 */
import { FeedbackEntry, SentimentLabel, clamp, safeRating } from './types';

const POSITIVE = ['bom','ótimo','excelente','rápido','fácil','adoro','gosto','melhor','feliz','recomendo','útil'];
const NEGATIVE = ['ruim','péssimo','lento','difícil','bug','erro','problema','confuso','caro','odeio','falha'];

export function scoreComment(comment?: string): number {
  if (!comment) return 0;
  const lower = comment.toLowerCase();
  let s = 0;
  for (const w of POSITIVE) if (lower.includes(w)) s += 1;
  for (const w of NEGATIVE) if (lower.includes(w)) s -= 1;
  return s;
}

export function sentimentOf(entry: FeedbackEntry): SentimentLabel {
  const lex = scoreComment(entry.comment);
  if (lex !== 0) return lex > 0 ? 'positive' : 'negative';
  const r = safeRating(entry.rating);
  if (r >= 9) return 'positive';
  if (r <= 6) return 'negative';
  return 'neutral';
}

export interface SentimentSummary {
  readonly score: number;        // 0-100
  readonly positive: number;
  readonly neutral: number;
  readonly negative: number;
}

export function aggregateSentiment(entries: readonly FeedbackEntry[]): SentimentSummary {
  let pos = 0, neg = 0, neu = 0;
  for (const e of entries) {
    const l = sentimentOf(e);
    if (l === 'positive') pos++;
    else if (l === 'negative') neg++;
    else neu++;
  }
  const total = entries.length;
  const score = total === 0 ? 0 : clamp(Math.round(((pos - neg) / total) * 50 + 50));
  return { score, positive: pos, neutral: neu, negative: neg };
}
