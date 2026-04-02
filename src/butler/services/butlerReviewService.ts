import { Artifact, ButlerItem } from '../../types';

export function resolveReviewState(item: ButlerItem, artifacts: Artifact[]) {
  if (item.clarificationQuestions.length > 0 && item.uncertainties.some((uncertainty) => /live .*access|mailbox|credentials/i.test(uncertainty))) {
    return { status: 'clarifying' as const, approvalState: 'pending' as const };
  }
  if (item.uncertainties.length && item.category === 'custom') return { status: 'clarifying' as const, approvalState: 'pending' as const };
  if (item.uncertainties.some((uncertainty) => /no .*found|still need/i.test(uncertainty)) && artifacts.length === 0) {
    return { status: 'blocked' as const, approvalState: 'pending' as const };
  }
  if (item.reviewRequirement === 'required' || item.reviewRequirement === 'recommended') {
    return { status: 'awaiting_review' as const, approvalState: 'pending' as const };
  }
  return { status: 'completed' as const, approvalState: 'not_needed' as const };
}
