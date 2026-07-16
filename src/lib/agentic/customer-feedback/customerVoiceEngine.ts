/**
 * Extracts top complaints (detractor comments) and top praises (promoter comments).
 */
import { FeedbackEntry, safeRating } from './types';
import { isPromoter } from './promoterEngine';
import { isDetractor } from './detractorEngine';

export interface VoiceItem {
  readonly id: string;
  readonly customerName?: string;
  readonly category: string;
  readonly rating: number;
  readonly comment: string;
}

export interface CustomerVoice {
  readonly topComplaints: VoiceItem[];
  readonly topPraises: VoiceItem[];
}

export function extractCustomerVoice(entries: readonly FeedbackEntry[], limit = 5): CustomerVoice {
  const withComment = entries.filter((e) => (e.comment ?? '').trim().length > 0);
  const complaints = withComment
    .filter((e) => isDetractor(e.rating))
    .sort((a, b) => safeRating(a.rating) - safeRating(b.rating))
    .slice(0, limit)
    .map(toItem);
  const praises = withComment
    .filter((e) => isPromoter(e.rating))
    .sort((a, b) => safeRating(b.rating) - safeRating(a.rating))
    .slice(0, limit)
    .map(toItem);
  return { topComplaints: complaints, topPraises: praises };
}

const toItem = (e: FeedbackEntry): VoiceItem => ({
  id: e.id, customerName: e.customerName, category: e.category,
  rating: safeRating(e.rating), comment: e.comment ?? '',
});
