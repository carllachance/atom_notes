import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoScene } from '../data/demoScene';
import { runButlerRequest } from '../butler/services/butlerOrchestrator';

test('butler creates a review-ready email artifact for email requests', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'Write an email about the vendor delay',
    notes: scene.notes,
    memoryPreferences: scene.memoryPreferences ?? []
  });

  assert.equal(result.item.category, 'email');
  assert.equal(result.item.status, 'awaiting_review');
  assert.equal(result.artifacts.some((artifact) => artifact.type === 'email_draft'), true);
});

test('butler creates package and email artifacts for dashboard prep', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'Send out the dashboard',
    notes: scene.notes,
    memoryPreferences: scene.memoryPreferences ?? []
  });

  assert.equal(result.item.category, 'reporting');
  assert.equal(result.artifacts.some((artifact) => artifact.type === 'report_package'), true);
  assert.equal(result.artifacts.some((artifact) => artifact.type === 'email_draft'), true);
});

test('butler stages inbox cleanup and unsubscribe artifacts for gmail cleanup requests', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'clean up my gmail inbox. unsubscribe from all the spam lists.',
    notes: scene.notes,
    memoryPreferences: scene.memoryPreferences ?? []
  });

  assert.equal(result.item.category, 'admin');
  assert.equal(result.item.status, 'clarifying');
  assert.equal(result.artifacts.some((artifact) => artifact.title === 'Inbox cleanup brief'), true);
  assert.equal(result.artifacts.some((artifact) => artifact.title === 'Unsubscribe candidates'), true);
  assert.equal(result.item.clarificationQuestions.length > 0, true);
});

test('gmail cleanup artifacts use live analysis when available', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'clean up my gmail inbox. unsubscribe from all the spam lists.',
    notes: scene.notes,
    memoryPreferences: scene.memoryPreferences ?? [],
    gmailCleanupAnalysis: {
      source: 'live',
      scannedMessageCount: 18,
      unsubscribeCandidateCount: 2,
      senderCandidates: [
        {
          sender: 'news@example.com',
          messageCount: 5,
          latestSubject: 'Weekly roundup',
          hasListUnsubscribe: true
        },
        {
          sender: 'promos@example.com',
          messageCount: 3,
          latestSubject: 'Spring sale',
          hasListUnsubscribe: true
        }
      ],
      summary: 'Shortlisted likely newsletter senders from recent inbox metadata.',
      generatedAt: Date.parse('2026-03-31T18:30:00Z')
    }
  });

  const checklist = result.artifacts.find((artifact) => artifact.title === 'Unsubscribe candidates');
  assert.equal(checklist?.body.includes('news@example.com'), true);
  assert.equal(checklist?.body.includes('promos@example.com'), true);
});

test('butler stages outlook unread summary artifacts for outlook review requests', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'check my outlook email and let me know if i am missing anything',
    notes: scene.notes,
    memoryPreferences: scene.memoryPreferences ?? []
  });

  assert.equal(result.item.category, 'admin');
  assert.equal(result.item.status, 'clarifying');
  assert.equal(result.workflowPlan.templateId, 'outlook-unread-summary-mvp');
  assert.equal(result.artifacts.some((artifact) => artifact.title === 'Outlook unread summary'), true);
  assert.equal(result.artifacts.some((artifact) => artifact.title === 'Unread messages to review'), true);
  assert.equal(result.item.clarificationQuestions.length > 0, true);
});

test('outlook unread summary uses live analysis when available', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'check my outlook email and let me know if i am missing anything',
    notes: scene.notes,
    memoryPreferences: scene.memoryPreferences ?? [],
    outlookUnreadAnalysis: {
      source: 'live',
      unreadCount: 2,
      urgentCount: 1,
      messages: [
        {
          id: 'm1',
          from: 'boss@example.com',
          subject: 'Need decision today',
          preview: 'Can you confirm the final direction before 3pm?',
          receivedAt: '2026-03-31T14:10:00Z',
          importance: 'high',
          webLink: 'https://outlook.office.com/mail/id/m1'
        },
        {
          id: 'm2',
          from: 'teammate@example.com',
          subject: 'FYI project notes',
          preview: 'Sharing the notes from this morning.',
          receivedAt: '2026-03-31T13:00:00Z',
          importance: 'normal',
          webLink: 'https://outlook.office.com/mail/id/m2'
        }
      ],
      summary: 'Summarized recent unread Outlook messages and highlighted likely urgent items.',
      generatedAt: Date.parse('2026-03-31T18:30:00Z')
    }
  });

  const checklist = result.artifacts.find((artifact) => artifact.title === 'Unread messages to review');
  assert.equal(checklist?.body.includes('boss@example.com'), true);
  assert.equal(checklist?.body.includes('Need decision today'), true);
});

test('butler blocks meeting note refinement when no source notes exist', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'Refine meeting notes',
    notes: scene.notes.filter((note) => !/meeting|call|standup|interview/i.test(`${note.title ?? ''} ${note.body}`)),
    memoryPreferences: scene.memoryPreferences ?? []
  });

  assert.equal(result.item.status, 'blocked');
  assert.equal(result.artifacts.length, 0);
});

test('ambiguous requests stay in clarifying state', () => {
  const scene = createDemoScene(Date.parse('2026-03-31T18:30:00Z'));
  const result = runButlerRequest({
    rawIntentText: 'Send that update',
    notes: scene.notes,
    memoryPreferences: scene.memoryPreferences ?? []
  });

  assert.equal(result.item.status, 'clarifying');
  assert.equal(result.artifacts.length > 0, true);
  assert.equal(result.item.clarificationQuestions.length > 0, true);
  assert.equal(result.logs.length > 0, true);
  assert.equal(result.artifacts.some((artifact) => artifact.title === 'Clarification brief'), true);
});
