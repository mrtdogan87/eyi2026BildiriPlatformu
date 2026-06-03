export const errors = {
  tr: {
    unexpected: "Beklenmeyen bir hata oluştu.",
    serverNoResponse: "Sunucudan beklenen yanıt alınamadı. Lütfen tekrar deneyin.",
    linkSendFailed: "Kayıt linki gönderilemedi.",
    linkVerifyFailed: "Bağlantı doğrulanamadı.",
    draftVerifyFailed: "Taslak bağlantısı doğrulanamadı. Lütfen e-postadaki linki yeniden açın.",
    draftInfoFailed: "Taslak bilgisi alınamadı. Lütfen tekrar deneyin.",
    draftVerifyUnexpected: "Taslak bağlantısı doğrulanırken beklenmeyen bir hata oluştu.",
  },
  en: {
    unexpected: "An unexpected error occurred.",
    serverNoResponse: "Could not get the expected response from the server. Please try again.",
    linkSendFailed: "The registration link could not be sent.",
    linkVerifyFailed: "The link could not be verified.",
    draftVerifyFailed: "The draft link could not be verified. Please reopen the link from the email.",
    draftInfoFailed: "Could not retrieve the draft. Please try again.",
    draftVerifyUnexpected: "An unexpected error occurred while verifying the draft link.",
  },
} as const;
