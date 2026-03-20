import test from 'node:test';
import assert from 'node:assert/strict';
import { computeArcPath, computeRelationshipVisualProps } from '../utils/arcPath';

test('computeArcPath returns string starting with M', () => {
  const result = computeArcPath({ x: 0, y: 0 }, { x: 100, y: 100 });
  assert.ok(result.startsWith('M'), `Expected to start with 'M', got: ${result}`);
});

test('computeArcPath with identical from/to returns just the M command', () => {
  const result = computeArcPath({ x: 50, y: 50 }, { x: 50, y: 50 });
  assert.equal(result, 'M 50 50');
});

test('computeRelationshipVisualProps returns correct color for task_dependency', () => {
  const props = computeRelationshipVisualProps({
    type: 'task_dependency',
    explicitness: 'explicit',
    lifecycle_state: 'active',
    reinforcement_score: 0.5,
  });
  assert.equal(props.color, '#7fd28d');
});

test('computeRelationshipVisualProps returns correct color for references', () => {
  const props = computeRelationshipVisualProps({
    type: 'references',
    explicitness: 'explicit',
    lifecycle_state: 'active',
    reinforcement_score: 0.5,
  });
  assert.equal(props.color, '#b48bff');
});

test('computeRelationshipVisualProps returns correct color for related_concept', () => {
  const props = computeRelationshipVisualProps({
    type: 'related_concept',
    explicitness: 'explicit',
    lifecycle_state: 'active',
    reinforcement_score: 0.5,
  });
  assert.equal(props.color, '#74b7ff');
});

test('computeRelationshipVisualProps returns correct color for conflicts_with', () => {
  const props = computeRelationshipVisualProps({
    type: 'conflicts_with',
    explicitness: 'explicit',
    lifecycle_state: 'active',
    reinforcement_score: 0.5,
  });
  assert.equal(props.color, '#ff8c7c');
});

test('opacity for active lifecycle state is 0.70', () => {
  const props = computeRelationshipVisualProps({
    type: 'related_concept',
    explicitness: 'explicit',
    lifecycle_state: 'active',
    reinforcement_score: 0.5,
  });
  assert.equal(props.opacity, 0.70);
});

test('opacity for cooling lifecycle state is 0.30', () => {
  const props = computeRelationshipVisualProps({
    type: 'related_concept',
    explicitness: 'explicit',
    lifecycle_state: 'cooling',
    reinforcement_score: 0.5,
  });
  assert.equal(props.opacity, 0.30);
});

test('opacity for historical lifecycle state is 0.12', () => {
  const props = computeRelationshipVisualProps({
    type: 'related_concept',
    explicitness: 'explicit',
    lifecycle_state: 'historical',
    reinforcement_score: 0.5,
  });
  assert.equal(props.opacity, 0.12);
});

test('strokeDasharray is empty string for explicit', () => {
  const props = computeRelationshipVisualProps({
    type: 'related_concept',
    explicitness: 'explicit',
    lifecycle_state: 'active',
    reinforcement_score: 0.5,
  });
  assert.equal(props.strokeDasharray, '');
});

test('strokeDasharray is 5 3 for inferred', () => {
  const props = computeRelationshipVisualProps({
    type: 'related_concept',
    explicitness: 'inferred',
    lifecycle_state: 'active',
    reinforcement_score: 0.5,
  });
  assert.equal(props.strokeDasharray, '5 3');
});
