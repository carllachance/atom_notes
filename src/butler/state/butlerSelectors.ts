import { ButlerState } from './butlerStore';

export function selectButlerItems(state: ButlerState) {
  return Object.values(state.items);
}

export function selectReviewReadyCount(state: ButlerState) {
  return Object.values(state.items).filter((item) => item.status === 'awaiting_review').length;
}
