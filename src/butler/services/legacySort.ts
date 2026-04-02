import { ButlerItem } from '../../types';
import { BUTLER_STATUS_ORDER } from '../domain/butlerStatus';

export function sortButlerItems(items: ButlerItem[]) {
  return [...items].sort((a, b) => {
    const statusDelta = BUTLER_STATUS_ORDER.indexOf(a.status) - BUTLER_STATUS_ORDER.indexOf(b.status);
    if (statusDelta !== 0) return statusDelta;
    return b.updatedAt - a.updatedAt;
  });
}
