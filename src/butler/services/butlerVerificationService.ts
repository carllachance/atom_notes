export function getNextStepLabel(status: string, reviewRequirement: string) {
  if (status === 'blocked') return 'Needs more context';
  if (status === 'clarifying') return 'Answer clarification questions';
  if (status === 'awaiting_review') return 'Review staged artifacts';
  if (status === 'completed') return 'Ready to archive';
  if (reviewRequirement === 'required') return 'Prepare review checkpoint';
  return 'Continue reversible prep';
}
