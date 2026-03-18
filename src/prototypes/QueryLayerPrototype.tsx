import { useEffect, useMemo, useRef, useState } from 'react';
import { queryPrototypeItems, queryPrototypePrompts, type QueryPrototypeAction, type QueryPrototypeItem } from './queryLayerPrototype.mock';

type QueryCategory = 'all' | 'task' | 'reference' | 'concept' | 'history';
type FocusFilter = 'all' | 'focus';

const categoryLabels: Record<QueryCategory, string> = {
  all: 'All',
  task: 'Tasks',
  reference: 'Sources',
  concept: 'Related',
  history: 'History'
};

const relationshipKindTone: Record<QueryPrototypeItem['relationships'][number]['kind'], string> = {
  task: 'query-prototype__relationship--task',
  source: 'query-prototype__relationship--source',
  related: 'query-prototype__relationship--related',
  history: 'query-prototype__relationship--history',
  conflict: 'query-prototype__relationship--conflict'
};

function rankItem(item: QueryPrototypeItem, query: string, category: QueryCategory, focusFilter: FocusFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  const haystack = [item.title, item.excerpt, item.summary, item.project, item.focus, ...item.tags].join(' ').toLowerCase();
  const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
  const matchesCategory = category === 'all' || item.noteType === category;
  const matchesFocus = focusFilter === 'all' || item.isFocus;

  if (!matchesQuery || !matchesCategory || !matchesFocus) {
    return null;
  }

  const queryBoost = normalizedQuery
    ? [item.title, item.excerpt, item.summary, item.project, item.focus, ...item.tags].reduce((score, field) => {
        const lower = field.toLowerCase();
        return score + (lower.includes(normalizedQuery) ? (lower === normalizedQuery ? 0.12 : 0.05) : 0);
      }, 0)
    : 0;

  const freshnessBoost = Math.max(0, 0.12 - item.recencyHours / 48 * 0.12);
  const typeBoost = category !== 'all' && item.noteType === category ? 0.08 : 0;
  const focusBoost = item.isFocus ? (focusFilter === 'focus' ? 0.18 : 0.07) : 0;

  return item.score + queryBoost + freshnessBoost + typeBoost + focusBoost;
}

function describeSurfaceState(category: QueryCategory, focusFilter: FocusFilter) {
  if (category === 'all' && focusFilter === 'all') {
    return 'Showing all ranked notes. Focus notes stay softly boosted so priority threads remain visible without taking over.';
  }

  if (category === 'all' && focusFilter === 'focus') {
    return 'Showing only Focus notes. Query ranking still favors exact matches first, then recency and project context.';
  }

  return `${categoryLabels[category]} are filtered${focusFilter === 'focus' ? ' and Focus-only is active' : ''}. Ranking remains deterministic: query match, recency, context, then Focus priority.`;
}

export function QueryLayerPrototype() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<QueryCategory>('all');
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(queryPrototypeItems[0]?.id ?? null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const rankedItems = useMemo(() => {
    return queryPrototypeItems
      .map((item) => ({ item, rank: rankItem(item, query, category, focusFilter) }))
      .filter((entry): entry is { item: QueryPrototypeItem; rank: number } => entry.rank !== null)
      .sort((left, right) => right.rank - left.rank);
  }, [category, focusFilter, query]);

  useEffect(() => {
    if (!rankedItems.length) {
      setSelectedId(null);
      return;
    }

    setSelectedId((current) => (current && rankedItems.some((entry) => entry.item.id === current) ? current : rankedItems[0].item.id));
  }, [rankedItems]);

  const selectedItem = rankedItems.find((entry) => entry.item.id === selectedId)?.item ?? rankedItems[0]?.item ?? null;

  const activeCount = rankedItems.filter((entry) => entry.item.recencyHours < 8).length;
  const sourceCount = rankedItems.reduce((count, entry) => count + entry.item.relationships.filter((relationship) => relationship.kind === 'source').length, 0);
  const focusCount = rankedItems.filter((entry) => entry.item.isFocus).length;
  const surfaceState = describeSurfaceState(category, focusFilter);

  const handleAction = (item: QueryPrototypeItem, action: QueryPrototypeAction) => {
    setActionMessage(`${action.label}: ${action.hint} (${item.title})`);
  };

  return (
    <main className="query-prototype-shell">
      <div className="query-prototype__ambient query-prototype__ambient--left" />
      <div className="query-prototype__ambient query-prototype__ambient--right" />
      <section className="query-prototype">
        <header className="query-prototype__hero">
          <div>
            <p className="query-prototype__eyebrow">Prototype · Query layer</p>
            <h1>Start with the question, keep the graph in reserve.</h1>
            <p className="query-prototype__lede">
              This demo surface keeps the interface calm, ranks likely notes first, and preserves room for real relationships,
              focus metadata, and provenance once it is connected to the store.
            </p>
          </div>
          <div className="query-prototype__hero-meta" aria-label="Prototype summary">
            <div>
              <span>Ranked notes</span>
              <strong>{rankedItems.length.toString().padStart(2, '0')}</strong>
            </div>
            <div>
              <span>Active now</span>
              <strong>{activeCount.toString().padStart(2, '0')}</strong>
            </div>
            <div>
              <span>Source links</span>
              <strong>{sourceCount.toString().padStart(2, '0')}</strong>
            </div>
          </div>
        </header>

        <section className="query-prototype__search-panel" aria-label="Query controls">
          <label className="query-prototype__search">
            <span className="query-prototype__search-label">Ask across the note universe</span>
            <div className="query-prototype__search-row">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try: what is blocking the launch review?"
              />
              <button type="button" onClick={() => setQuery('')}>Clear</button>
            </div>
          </label>

          <div className="query-prototype__prompt-row" aria-label="Sample prompts">
            {queryPrototypePrompts.map((prompt) => (
              <button key={prompt} type="button" className="query-prototype__prompt" onClick={() => setQuery(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="query-prototype__toolbar">
            <div className="query-prototype__category-row" role="tablist" aria-label="Query categories">
              {(Object.keys(categoryLabels) as QueryCategory[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={category === value}
                  className={category === value ? 'query-prototype__category query-prototype__category--active' : 'query-prototype__category'}
                  onClick={() => setCategory(value)}
                >
                  {categoryLabels[value]}
                </button>
              ))}
            </div>

            <div className="query-prototype__focus-controls" aria-label="Focus controls">
              <button
                type="button"
                className={focusFilter === 'focus' ? 'query-prototype__focus-toggle query-prototype__focus-toggle--active' : 'query-prototype__focus-toggle'}
                onClick={() => setFocusFilter((current) => (current === 'focus' ? 'all' : 'focus'))}
              >
                Focus only
              </button>
              <span className="query-prototype__focus-state">
                {focusFilter === 'focus' ? `${focusCount} Focus notes visible` : `${focusCount} Focus notes softly boosted`}
              </span>
            </div>
          </div>

          <div className="query-prototype__surface-state" role="status" aria-live="polite">
            <strong>Surface state</strong>
            <p>{surfaceState}</p>
          </div>
        </section>

        <section className="query-prototype__content">
          <aside className="query-prototype__results" aria-label="Ranked result list">
            <div className="query-prototype__section-heading">
              <span>Top matches</span>
              <strong>{rankedItems.length} surfaced</strong>
            </div>

            {rankedItems.length ? (
              rankedItems.map(({ item, rank }, index) => {
                const isSelected = selectedItem?.id === item.id;
                const isTopResult = index === 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      'query-prototype__result',
                      isSelected ? 'query-prototype__result--active' : '',
                      isTopResult ? 'query-prototype__result--top' : '',
                      item.isFocus ? 'query-prototype__result--focus' : ''
                    ].filter(Boolean).join(' ')}
                    style={{ animationDelay: `${index * 55}ms` }}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="query-prototype__result-rank">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="query-prototype__result-headline">
                        <strong>{item.title}</strong>
                        <span>{Math.round(rank * 100)}%</span>
                      </div>
                      <p>{item.excerpt}</p>
                      <div className="query-prototype__result-meta">
                        <span>{item.project}</span>
                        <span>{item.focus}</span>
                        <span>{item.recencyLabel}</span>
                        {item.isFocus ? <span className="query-prototype__inline-badge">Focus</span> : null}
                        {isTopResult ? <span className="query-prototype__inline-badge query-prototype__inline-badge--top">Top result</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="query-prototype__empty-state">
                <strong>No matches yet.</strong>
                <p>Try a broader prompt or switch back to All to widen the prototype surface.</p>
              </div>
            )}
          </aside>

          <section className="query-prototype__detail" aria-live="polite">
            {selectedItem ? (
              <>
                <div className="query-prototype__detail-card">
                  <div className="query-prototype__detail-header">
                    <div>
                      <p className="query-prototype__detail-kicker">Selected note</p>
                      <h2>{selectedItem.title}</h2>
                    </div>
                    <div className="query-prototype__detail-badges">
                      <span className="query-prototype__detail-type">{categoryLabels[selectedItem.noteType]}</span>
                      {selectedItem.isFocus ? <span className="query-prototype__detail-focus">Focus</span> : null}
                    </div>
                  </div>

                  <p className="query-prototype__detail-summary">{selectedItem.summary}</p>

                  <div className="query-prototype__metadata-grid">
                    <div>
                      <span>Project</span>
                      <strong>{selectedItem.project}</strong>
                    </div>
                    <div>
                      <span>Focus</span>
                      <strong>{selectedItem.focus}</strong>
                    </div>
                    <div>
                      <span>Recency</span>
                      <strong>{selectedItem.recencyLabel}</strong>
                    </div>
                  </div>

                  <div className="query-prototype__action-strip" aria-label="Suggested actions">
                    {selectedItem.actions.map((action) => (
                      <button key={action.id} type="button" className="query-prototype__action-chip" onClick={() => handleAction(selectedItem, action)}>
                        {action.label}
                      </button>
                    ))}
                  </div>

                  {actionMessage ? <p className="query-prototype__action-feedback">{actionMessage}</p> : null}
                </div>

                <div className="query-prototype__relationship-card">
                  <div className="query-prototype__section-heading">
                    <span>Relationship preview</span>
                    <strong>{selectedItem.relationships.length} signals</strong>
                  </div>

                  <div className="query-prototype__relationship-web" aria-hidden="true">
                    <svg viewBox="0 0 520 210" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="queryPrototypeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="rgba(152, 178, 255, 0.38)" />
                          <stop offset="100%" stopColor="rgba(119, 142, 220, 0.05)" />
                        </linearGradient>
                      </defs>
                      <circle cx="260" cy="105" r="34" className="query-prototype__web-node query-prototype__web-node--core" />
                      {selectedItem.relationships.map((relationship, index) => {
                        const x = 84 + index * 168;
                        const y = index % 2 === 0 ? 48 : 162;
                        return (
                          <g key={relationship.id}>
                            <path d={`M260 105 C ${x + 36} ${105}, ${x - 10} ${y}, ${x} ${y}`} className={`query-prototype__web-edge query-prototype__web-edge--${relationship.kind}`} />
                            <circle cx={x} cy={y} r="22" className="query-prototype__web-node" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div className="query-prototype__relationship-list">
                    {selectedItem.relationships.map((relationship) => (
                      <article key={relationship.id} className={`query-prototype__relationship ${relationshipKindTone[relationship.kind]}`}>
                        <div className="query-prototype__relationship-headline">
                          <strong>{relationship.noteTitle}</strong>
                          <span>{relationship.label}</span>
                        </div>
                        <p>{relationship.explanation}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </section>
      </section>
    </main>
  );
}
