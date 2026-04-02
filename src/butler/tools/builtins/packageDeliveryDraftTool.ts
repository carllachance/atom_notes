import { NoteCardModel } from '../../../types';
import { ButlerTool } from '../butlerToolRegistry';

export type PackageDeliveryDraftInput = {
  artifactNote: NoteCardModel | null;
  freshnessSummary: string;
  recipients: string[];
};

export type PackageDeliveryDraftOutput = {
  title: string;
  body: string;
};

export const packageDeliveryDraftTool: ButlerTool<PackageDeliveryDraftInput, PackageDeliveryDraftOutput> = {
  id: 'package_delivery_draft',
  label: 'Package Delivery Draft',
  run(input) {
    const title = input.artifactNote ? `${input.artifactNote.title ?? 'Dashboard'} package` : 'Delivery package';
    const recipientLine = input.recipients.length ? `Likely recipients: ${input.recipients.join(', ')}.` : 'Recipient list still needs review.';
    return {
      title,
      body: `${input.artifactNote?.title ?? 'No dashboard source located yet.'}\n\n${input.freshnessSummary}\n\n${recipientLine}`
    };
  }
};
