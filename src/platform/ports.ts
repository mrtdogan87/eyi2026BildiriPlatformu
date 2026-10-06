import type { requireContext } from './context';
import type { privateFile } from './files';
import type { enqueueNotification } from './notifications';
import type { auditSink } from './audit';
// Business modules use these server contracts; the Congress integration supplies event records.
// These ports do not require CMS, review, payment or certificate business tables.
export interface IdentityContextPort { authorize: typeof requireContext }
export interface PrivateFilePort { download: typeof privateFile }
export interface NotificationPort { enqueue: typeof enqueueNotification }
export type TransactionAuditPort = ReturnType<typeof auditSink>;
