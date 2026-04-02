import { Artifact, ButlerItem, ExecutionLog, GmailCleanupAnalysis, MemoryPreference, NoteCardModel, OutlookUnreadAnalysis, WorkflowPlan } from '../../types';
import { createArtifact } from './butlerArtifactService';
import { resolveReviewState } from './butlerReviewService';
import { draftEmailTool, DraftEmailOutput } from '../tools/builtins/draftEmailTool';
import { findLatestDashboardTool, FindLatestDashboardOutput } from '../tools/builtins/findLatestDashboardTool';
import { packageDeliveryDraftTool, PackageDeliveryDraftOutput } from '../tools/builtins/packageDeliveryDraftTool';
import { refineMeetingNotesTool, RefineMeetingNotesOutput } from '../tools/builtins/refineMeetingNotesTool';
import { stageInboxCleanupTool, StageInboxCleanupOutput } from '../tools/builtins/stageInboxCleanupTool';
import { stageOutlookUnreadSummaryTool, StageOutlookUnreadSummaryOutput } from '../tools/builtins/stageOutlookUnreadSummaryTool';
import { verifyArtifactFreshnessTool, VerifyArtifactFreshnessOutput } from '../tools/builtins/verifyArtifactFreshnessTool';

type ButlerExecutionContext = {
  notes: NoteCardModel[];
  memoryPreferences: MemoryPreference[];
  gmailCleanupAnalysis?: GmailCleanupAnalysis | null;
  outlookUnreadAnalysis?: OutlookUnreadAnalysis | null;
};

export type ButlerExecutionResult = {
  updatedItem: ButlerItem;
  updatedPlan: WorkflowPlan;
  artifacts: Artifact[];
  logs: ExecutionLog[];
};

function createLog(itemId: string, action: string, result: string, notes: string, actorType: ExecutionLog['actorType'] = 'tool'): ExecutionLog {
  return {
    id: crypto.randomUUID(),
    butlerItemId: itemId,
    timestamp: Date.now(),
    actorType,
    action,
    result,
    evidenceLinks: [],
    notes
  };
}

function markAllStepsRunning(plan: WorkflowPlan): WorkflowPlan {
  return {
    ...plan,
    steps: plan.steps.map((step) => ({ ...step, status: 'running' }))
  };
}

function updateStepStatus(plan: WorkflowPlan, title: string, status: WorkflowPlan['steps'][number]['status'], evidence: string[] = [], errors: string[] = []): WorkflowPlan {
  return {
    ...plan,
    steps: plan.steps.map((step) => step.title === title ? { ...step, status, evidence, errors } : step)
  };
}

function findMeetingSource(notes: NoteCardModel[]) {
  return [...notes]
    .filter((note) => !note.archived && !note.deleted)
    .find((note) => /meeting|call|standup|interview/i.test(`${note.title ?? ''} ${note.body}`)) ?? null;
}

function findSourceNoteByIds(notes: NoteCardModel[], sourceIds: string[]) {
  return notes.find((note) => sourceIds.includes(note.id) && !note.archived && !note.deleted) ?? null;
}

function buildMailboxAccessQuestions(provider: 'gmail' | 'outlook', mode: 'cleanup' | 'summary') {
  const providerLabel = provider === 'gmail' ? 'Gmail' : 'Outlook';
  const tokenId = provider === 'gmail' ? 'gmail-access-token' : 'outlook-access-token';
  const modeLabel = mode === 'cleanup' ? 'read live mailbox cleanup candidates' : 'read live unread messages';
  return [
    {
      id: tokenId,
      prompt: `Paste a temporary ${providerLabel} access token for this run`,
      detail: `Butler can use it to ${modeLabel} and replace the fallback artifact with live mailbox results.`,
      placeholder: 'Paste a temporary access token',
      answer: ''
    },
    {
      id: `${provider}-fallback-mode`,
      prompt: `If you do not want to connect ${providerLabel} yet, what should Butler do next?`,
      detail: 'This keeps the review boundary explicit instead of guessing.',
      options: ['Keep the staged summary', 'Stay blocked until live access works'],
      answer: ''
    }
  ];
}

export function executePlan(item: ButlerItem, plan: WorkflowPlan, context: ButlerExecutionContext): ButlerExecutionResult {
  let nextPlan: WorkflowPlan = markAllStepsRunning(plan);
  const artifacts: Artifact[] = [];
  const logs: ExecutionLog[] = [];

  if (item.category === 'email') {
    nextPlan = updateStepStatus(nextPlan, 'Gather context', 'completed');
    const email = draftEmailTool.run({
      goal: item.rawIntentText,
      tone: 'neutral'
    }) as DraftEmailOutput;
    const emailArtifact = createArtifact({
      type: 'email_draft',
      title: email.subject,
      body: `Subject: ${email.subject}\n\n${email.body}`,
      linkedSourceIds: item.sourceContext.flatMap((contextEntry) => contextEntry.sourceIds),
      status: 'ready_for_review',
      provenance: 'Drafted by the Butler email workflow.',
      changeSummary: 'Created a first-pass email draft for review.'
    });
    artifacts.push(emailArtifact);
    nextPlan = updateStepStatus(nextPlan, 'Draft email', 'completed', [emailArtifact.id]);
    logs.push(createLog(item.id, 'Drafted email artifact', 'awaiting_review', 'Prepared a draft without sending.'));
    const uncertainties = [...item.uncertainties, ...email.uncertainties];
    const review = resolveReviewState({ ...item, uncertainties }, artifacts);
    return {
      updatedItem: {
        ...item,
        updatedAt: Date.now(),
        status: review.status,
        approvalState: review.approvalState,
        artifactIds: [emailArtifact.id],
        assumptions: [...item.assumptions, ...email.assumptions],
        uncertainties,
        executionLogIds: logs.map((log) => log.id)
      },
      updatedPlan: nextPlan,
      artifacts,
      logs
    };
  }

  if (item.category === 'reporting') {
    const latest = findLatestDashboardTool.run({ notes: context.notes }) as FindLatestDashboardOutput;
    nextPlan = updateStepStatus(nextPlan, 'Locate latest dashboard', latest.note ? 'completed' : 'blocked', latest.note ? [latest.note.id] : [], latest.note ? [] : ['No dashboard artifact found.']);
    logs.push(createLog(item.id, 'Searched for latest dashboard', latest.note ? 'succeeded' : 'blocked', latest.note ? `Found ${latest.note.title ?? latest.note.id}.` : 'No dashboard-related note found.'));

    const freshness = verifyArtifactFreshnessTool.run({ artifactNote: latest.note, asOf: Date.now(), maxAgeHours: 24 * 90 }) as VerifyArtifactFreshnessOutput;
    nextPlan = updateStepStatus(nextPlan, 'Verify freshness', latest.note ? (freshness.isFresh ? 'completed' : 'blocked') : 'blocked', [], freshness.isFresh ? [] : [freshness.summary]);

    if (latest.note) {
      const packaged = packageDeliveryDraftTool.run({
        artifactNote: latest.note,
        freshnessSummary: freshness.summary,
        recipients: []
      }) as PackageDeliveryDraftOutput;
      const packageArtifact = createArtifact({
        type: 'report_package',
        title: packaged.title,
        body: packaged.body,
        linkedSourceIds: [latest.note.id],
        status: freshness.isFresh ? 'ready_for_review' : 'draft',
        provenance: 'Packaged by the Butler dashboard workflow.',
        changeSummary: freshness.summary
      });
      artifacts.push(packageArtifact);

      if (freshness.isFresh) {
        const email = draftEmailTool.run({
          goal: item.rawIntentText,
          sourceSummary: packaged.body,
          tone: 'concise'
        }) as DraftEmailOutput;
        const emailArtifact = createArtifact({
          type: 'email_draft',
          title: email.subject,
          body: `Subject: ${email.subject}\n\n${email.body}`,
          linkedSourceIds: [packageArtifact.id],
          status: 'ready_for_review',
          provenance: 'Drafted by the Butler dashboard workflow.',
          changeSummary: 'Prepared the cover email and stopped at review.'
        });
        artifacts.push(emailArtifact);
        nextPlan = updateStepStatus(nextPlan, 'Package report and draft cover email', 'completed', [packageArtifact.id, emailArtifact.id]);
      } else {
        nextPlan = updateStepStatus(nextPlan, 'Package report and draft cover email', 'blocked', [packageArtifact.id], [freshness.summary]);
      }
    } else {
      nextPlan = updateStepStatus(nextPlan, 'Package report and draft cover email', 'blocked', [], ['No dashboard package could be staged without a source artifact.']);
    }

    logs.push(createLog(item.id, 'Packaged dashboard prep', freshness.isFresh ? 'awaiting_review' : 'blocked', freshness.summary));
    const uncertainties = latest.note ? (freshness.isFresh ? [] : [freshness.summary]) : ['No dashboard artifact was found.'];
    const review = resolveReviewState({ ...item, uncertainties }, artifacts);
    return {
      updatedItem: {
        ...item,
        updatedAt: Date.now(),
        status: review.status,
        approvalState: review.approvalState,
        artifactIds: artifacts.map((artifact) => artifact.id),
        executionLogIds: logs.map((log) => log.id),
        uncertainties
      },
      updatedPlan: nextPlan,
      artifacts,
      logs
    };
  }

  if (item.category === 'notes') {
    const source = findSourceNoteByIds(context.notes, item.sourceContext.flatMap((contextEntry) => contextEntry.sourceIds)) ?? findMeetingSource(context.notes);
    nextPlan = updateStepStatus(nextPlan, 'Retrieve source notes', source ? 'completed' : 'blocked', source ? [source.id] : [], source ? [] : ['No meeting note source found.']);
    const refined = refineMeetingNotesTool.run({ note: source }) as RefineMeetingNotesOutput;
    if (source && refined.refinedBody) {
      const noteArtifact = createArtifact({
        type: 'note_draft',
        title: `${source.title ?? 'Meeting notes'} refined`,
        body: refined.refinedBody,
        linkedSourceIds: [source.id],
        status: 'ready_for_review',
        provenance: 'Refined by the Butler meeting notes workflow.',
        changeSummary: 'Turned the rough note into a structured draft.'
      });
      artifacts.push(noteArtifact);
      if (refined.checklistBody) {
        artifacts.push(createArtifact({
          type: 'checklist',
          title: `${source.title ?? 'Meeting notes'} follow-ups`,
          body: refined.checklistBody,
          linkedSourceIds: [source.id],
          status: 'draft',
          provenance: 'Extracted by the Butler meeting notes workflow.',
          changeSummary: 'Collected follow-up actions into a checklist.'
        }));
      }
      nextPlan = updateStepStatus(nextPlan, 'Refine and extract follow-ups', 'completed', artifacts.map((artifact) => artifact.id));
    } else {
      nextPlan = updateStepStatus(nextPlan, 'Refine and extract follow-ups', 'blocked', [], refined.uncertainties);
    }
    logs.push(createLog(item.id, 'Refined meeting notes', artifacts.length ? 'awaiting_review' : 'blocked', artifacts.length ? 'Prepared a structured note draft.' : 'Could not find source meeting notes.'));
    const review = resolveReviewState({ ...item, uncertainties: refined.uncertainties }, artifacts);
    return {
      updatedItem: {
        ...item,
        updatedAt: Date.now(),
        status: review.status,
        approvalState: review.approvalState,
        artifactIds: artifacts.map((artifact) => artifact.id),
        executionLogIds: logs.map((log) => log.id),
        assumptions: [...item.assumptions, ...refined.assumptions],
        uncertainties: [...item.uncertainties, ...refined.uncertainties]
      },
      updatedPlan: nextPlan,
      artifacts,
      logs
    };
  }

  if (item.category === 'admin') {
    if (plan.templateId === 'outlook-unread-summary-mvp') {
      const staged = stageOutlookUnreadSummaryTool.run({
        goal: item.rawIntentText,
        analysis: context.outlookUnreadAnalysis ?? null
      }) as StageOutlookUnreadSummaryOutput;
      const dataSource = context.outlookUnreadAnalysis?.source === 'live' ? 'live' : 'fallback';
      const summaryArtifact = createArtifact({
        type: 'summary',
        title: 'Outlook unread summary',
        body: staged.summaryBody,
        linkedSourceIds: item.sourceContext.flatMap((contextEntry) => contextEntry.sourceIds),
        status: 'ready_for_review',
        provenance: 'Prepared by the Butler Outlook unread summary workflow.',
        changeSummary: 'Staged an unread inbox digest without changing Outlook mailbox state.',
        metadata: { source: dataSource }
      });
      const checklistArtifact = createArtifact({
        type: 'checklist',
        title: 'Unread messages to review',
        body: staged.checklistBody,
        linkedSourceIds: item.sourceContext.flatMap((contextEntry) => contextEntry.sourceIds),
        status: 'ready_for_review',
        provenance: 'Prepared by the Butler Outlook unread summary workflow.',
        changeSummary: 'Collected unread messages that may need review.',
        metadata: { source: dataSource }
      });
      artifacts.push(summaryArtifact, checklistArtifact);
      nextPlan = updateStepStatus(nextPlan, 'Scan unread Outlook inbox', 'completed', [summaryArtifact.id]);
      nextPlan = updateStepStatus(nextPlan, 'Stage unread summary', 'completed', [summaryArtifact.id, checklistArtifact.id]);
      logs.push(createLog(
        item.id,
        'Staged Outlook unread summary',
        'awaiting_review',
        context.outlookUnreadAnalysis?.source === 'live'
          ? 'Prepared an unread Outlook summary from live mailbox metadata without changing Outlook.'
          : 'Prepared a review-first unread Outlook summary without changing Outlook.'
      ));
      const clarificationQuestions = dataSource === 'live' ? [] : buildMailboxAccessQuestions('outlook', 'summary');
      const review = resolveReviewState({ ...item, uncertainties: staged.uncertainties, clarificationQuestions }, artifacts);
      return {
        updatedItem: {
          ...item,
          updatedAt: Date.now(),
          status: review.status,
          approvalState: review.approvalState,
          artifactIds: artifacts.map((artifact) => artifact.id),
          executionLogIds: logs.map((log) => log.id),
          assumptions: [...item.assumptions, ...staged.assumptions],
          uncertainties: [...item.uncertainties, ...staged.uncertainties],
          clarificationQuestions
        },
        updatedPlan: nextPlan,
        artifacts,
        logs
      };
    }

    const staged = stageInboxCleanupTool.run({ goal: item.rawIntentText, analysis: context.gmailCleanupAnalysis ?? null }) as StageInboxCleanupOutput;
    const dataSource = context.gmailCleanupAnalysis?.source === 'live' ? 'live' : 'fallback';
    const summaryArtifact = createArtifact({
      type: 'summary',
      title: 'Inbox cleanup brief',
      body: staged.summaryBody,
      linkedSourceIds: item.sourceContext.flatMap((contextEntry) => contextEntry.sourceIds),
      status: 'ready_for_review',
      provenance: 'Prepared by the Butler Gmail cleanup workflow.',
      changeSummary: 'Staged a safe cleanup brief without changing the mailbox.',
      metadata: { source: dataSource }
    });
    const checklistArtifact = createArtifact({
      type: 'checklist',
      title: 'Unsubscribe candidates',
      body: staged.checklistBody,
      linkedSourceIds: item.sourceContext.flatMap((contextEntry) => contextEntry.sourceIds),
      status: 'ready_for_review',
      provenance: 'Prepared by the Butler Gmail cleanup workflow.',
      changeSummary: 'Collected review-first unsubscribe candidates.',
      metadata: { source: dataSource }
    });
    artifacts.push(summaryArtifact, checklistArtifact);
    nextPlan = updateStepStatus(nextPlan, 'Scope inbox cleanup', 'completed', [summaryArtifact.id]);
    nextPlan = updateStepStatus(nextPlan, 'Stage unsubscribe candidates', 'completed', [summaryArtifact.id, checklistArtifact.id]);
    logs.push(createLog(
      item.id,
      'Staged inbox cleanup package',
      'awaiting_review',
      context.gmailCleanupAnalysis?.source === 'live'
        ? 'Prepared a cleanup brief and unsubscribe candidate checklist from live Gmail metadata without changing Gmail.'
        : 'Prepared a cleanup brief and unsubscribe candidate checklist without changing Gmail.'
    ));
    const clarificationQuestions = dataSource === 'live' ? [] : buildMailboxAccessQuestions('gmail', 'cleanup');
    const review = resolveReviewState({ ...item, uncertainties: staged.uncertainties, clarificationQuestions }, artifacts);
    return {
      updatedItem: {
        ...item,
        updatedAt: Date.now(),
        status: review.status,
        approvalState: review.approvalState,
        artifactIds: artifacts.map((artifact) => artifact.id),
        executionLogIds: logs.map((log) => log.id),
        assumptions: [...item.assumptions, ...staged.assumptions],
        uncertainties: [...item.uncertainties, ...staged.uncertainties],
        clarificationQuestions
      },
      updatedPlan: nextPlan,
      artifacts,
      logs
    };
  }

  return {
    updatedItem: {
      ...item,
      updatedAt: Date.now(),
      status: 'clarifying',
      uncertainties: [...item.uncertainties, 'No supported Butler workflow matched this request.']
    },
    updatedPlan: plan,
    artifacts: [],
    logs: [createLog(item.id, 'Stopped for clarification', 'blocked', 'Unsupported request type.', 'orchestrator')]
  };
}
