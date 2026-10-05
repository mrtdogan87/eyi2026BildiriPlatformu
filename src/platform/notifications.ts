// Single notification port: the environment-aware adapter captures mail outside production.
export { isEmailConfigured, sendAccountActivationEmail, sendSubmissionStatusEmail } from '@/lib/email';
