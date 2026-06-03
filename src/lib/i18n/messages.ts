import { common } from "./messages/common";
import { hub } from "./messages/hub";
import { submission } from "./messages/submission";
import { registration } from "./messages/registration";
import { quote } from "./messages/quote";
import { errors } from "./messages/errors";
import { email } from "./messages/email";

export const messages = {
  tr: {
    common: common.tr,
    hub: hub.tr,
    submission: submission.tr,
    registration: registration.tr,
    quote: quote.tr,
    errors: errors.tr,
    email: email.tr,
  },
  en: {
    common: common.en,
    hub: hub.en,
    submission: submission.en,
    registration: registration.en,
    quote: quote.en,
    errors: errors.en,
    email: email.en,
  },
} as const;

export type Messages = typeof messages;
