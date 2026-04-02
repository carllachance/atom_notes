import { ButlerItem } from '../../types';

type ButlerAssumptionsPanelProps = {
  item: ButlerItem;
};

export function ButlerAssumptionsPanel({ item }: ButlerAssumptionsPanelProps) {
  return (
    <section className="butler-detail__section">
      <div className="butler-detail__section-head">
        <strong>Review frame</strong>
        <span>{item.approvalState.replace(/_/g, ' ')}</span>
      </div>
      {item.assumptions.length ? (
        <div className="butler-bullet-block">
          <strong>Assumptions</strong>
          {item.assumptions.map((assumption) => <p key={assumption}>{assumption}</p>)}
        </div>
      ) : null}
      {item.uncertainties.length ? (
        <div className="butler-bullet-block">
          <strong>Uncertainties</strong>
          {item.uncertainties.map((uncertainty) => <p key={uncertainty}>{uncertainty}</p>)}
        </div>
      ) : null}
    </section>
  );
}
