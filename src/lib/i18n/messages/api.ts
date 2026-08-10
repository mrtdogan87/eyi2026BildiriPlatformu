export const api = {
  tr: {
    // Başarı mesajları
    draftCreated: "Taslak oluşturuldu. Güvenli giriş linki e-posta adresinize gönderildi.",
    draftCreatedDev:
      "Taslak oluşturuldu. Geliştirme ortamında bağlantı aşağıda önizleme olarak gösteriliyor.",
    regLinkSent: "Kayıt linki e-posta adresinize gönderildi.",
    regLinkSentDev:
      "Kayıt linki üretildi. Geliştirme ortamında bağlantı aşağıda önizleme olarak gösteriliyor.",
    // Ortak / link
    congressEmailRequired: "Kongre ve e-posta zorunludur.",
    draftEmailFailed:
      "Taslak oluşturuldu ancak e-posta gönderilemedi. Resend API ayarlarını kontrol edin.",
    draftResendMissing: "Taslak linki göndermek için Resend API ayarları eksik.",
    regLinkEmailFailed: "Bağlantı oluşturuldu ancak e-posta gönderilemedi.",
    regResendMissing: "Kayıt linki göndermek için Resend API ayarları eksik.",
    invalidOrExpiredLink: "Geçersiz veya süresi dolmuş link.",
    verifyLinkMissing: "Doğrulama bağlantısı eksik.",
    regLinkInvalid: "Bağlantı geçersiz ya da süresi dolmuş. Lütfen yeni bir bağlantı isteyin.",
    // Taslak / bildiri
    draftNoAccess: "Bu taslağa erişim izniniz yok.",
    submissionNotFound: "Bildiri bulunamadı.",
    declarationsRequired: "Bildirinizi gönderebilmek için tüm beyanları onaylamalısınız.",
    participationRequiredSubmit:
      "Sunum bilgilerinizi (yüz yüze/çevrim içi ve akademik statü) seçmelisiniz.",
    presenterNotFound: "Sunan yazar bilgisi bulunamadı.",
    docxRequired: "DOCX dosyası zorunludur.",
    fileMissing: "Yüklenecek dosya bulunamadı.",
    docxInvalid: "Dosya DOCX olmalı ve 10 MB sınırını aşmamalı.",
    presenterEmailMismatch:
      "Sunan yazarın e-postası, taslağı başlattığınız e-posta ile aynı olmalıdır.",
    emailUsedTwice: "{email} adresi daha önce iki kez kullanıldığı için yeni gönderim yapamaz.",
    // Bildiri detay doğrulama
    langRequired: "Bildiri dili zorunludur.",
    titleTrRequired: "Türkçe başlık zorunludur.",
    abstractTrRequired: "Türkçe özet zorunludur.",
    keywordsTrRequired: "Türkçe anahtar kelimeler zorunludur.",
    titleEnRequired: "İngilizce başlık zorunludur.",
    abstractEnRequired: "İngilizce özet zorunludur.",
    keywordsEnRequired: "İngilizce anahtar kelimeler zorunludur.",
    // Yazar doğrulama
    atLeastOneAuthor: "En az bir yazar eklemelisiniz.",
    authorNameRequired: "Tüm yazarlar için ad soyad zorunludur.",
    authorTitleRequired: "Tüm yazarlar için unvan zorunludur.",
    authorEmailRequired: "Tüm yazarlar için e-posta zorunludur.",
    duplicateEmail: "Aynı bildiri içinde aynı e-posta birden fazla kez kullanılamaz.",
    exactlyOnePresenter: "Tam olarak bir sunan yazar seçmelisiniz.",
    // Sunum doğrulama
    presentationRequired: "Sunum şekli zorunludur.",
    audienceRequired: "Akademik statünüzü seçmelisiniz.",
    // Kayıt
    sessionNotFound: "Oturum bulunamadı.",
    congressNotFound: "Kongre bulunamadı.",
    contextFailed: "Kayıt bağlamı oluşturulamadı.",
    nameRequired: "Ad soyad zorunludur.",
    selectPaperOrListener: "Bildiri seçmelisiniz veya dinleyici olarak kaydolmalısınız.",
    papersNotVerified: "Seçilen bildirilerden bazıları doğrulanamadı.",
    paymentAlready: "Seçilen bildirilerden biri için ödeme zaten kaydedilmiş.",
    amountFailed: "Tutar hesaplanamadı.",
    receiptRequired: "Dekont yüklemelisiniz.",
    receiptInvalid: "Dekont PDF, JPG, JPEG veya PNG olmalı ve 10 MB sınırını aşmamalı.",
    studentDocInvalid: "Öğrenci belgesi PDF, JPG, JPEG veya PNG olmalı ve 10 MB sınırını aşmamalı.",
    // Ücret hesaplama (calculateRegistration)
    paymentClosed: "Kayıt süresi sona erdiği için ödeme alınmıyor.",
    audienceMissingForPapers: "Bildiriler için akademik statü bilgisi eksik.",
    paperTierNotFound: "Bildiri için ücret tanımı bulunamadı ({title}).",
    listenerModeRequired: "Dinleyici katılımı için sunum şekli seçmelisiniz.",
    listenerAudienceRequired: "Yüz yüze dinleyici için akademik statü seçmelisiniz.",
    listenerDayRequired: "Dinleyici katılımı için en az bir gün seçmelisiniz.",
    listenerTierNotFound: "Dinleyici katılımı için ücret tanımı bulunamadı.",
    submissionsClosed:
      "Bildiri gönderimi sona ermiştir. Kabul edilen bildiriler için kayıt işlemleri devam etmektedir.",
  },
  en: {
    // Success messages
    draftCreated: "Draft created. A secure login link has been sent to your email address.",
    draftCreatedDev:
      "Draft created. In the development environment the link is shown below as a preview.",
    regLinkSent: "The registration link has been sent to your email address.",
    regLinkSentDev:
      "Registration link generated. In the development environment the link is shown below as a preview.",
    // Common / link
    congressEmailRequired: "Congress and email are required.",
    draftEmailFailed:
      "The draft was created but the email could not be sent. Check the Resend API settings.",
    draftResendMissing: "Resend API settings are missing to send the draft link.",
    regLinkEmailFailed: "The link was created but the email could not be sent.",
    regResendMissing: "Resend API settings are missing to send the registration link.",
    invalidOrExpiredLink: "Invalid or expired link.",
    verifyLinkMissing: "The verification link is missing.",
    regLinkInvalid: "The link is invalid or has expired. Please request a new link.",
    // Draft / paper
    draftNoAccess: "You do not have permission to access this draft.",
    submissionNotFound: "Paper not found.",
    declarationsRequired: "You must approve all declarations to submit your paper.",
    participationRequiredSubmit:
      "You must select your presentation details (in person/online and academic status).",
    presenterNotFound: "Presenting author information not found.",
    docxRequired: "A DOCX file is required.",
    fileMissing: "No file to upload was found.",
    docxInvalid: "The file must be DOCX and must not exceed 10 MB.",
    presenterEmailMismatch:
      "The presenting author's email must be the same as the email you started the draft with.",
    emailUsedTwice:
      "The address {email} cannot make a new submission because it has already been used twice.",
    // Paper detail validation
    langRequired: "Paper language is required.",
    titleTrRequired: "The Turkish title is required.",
    abstractTrRequired: "The Turkish abstract is required.",
    keywordsTrRequired: "Turkish keywords are required.",
    titleEnRequired: "The English title is required.",
    abstractEnRequired: "The English abstract is required.",
    keywordsEnRequired: "English keywords are required.",
    // Author validation
    atLeastOneAuthor: "You must add at least one author.",
    authorNameRequired: "Full name is required for all authors.",
    authorTitleRequired: "A title is required for all authors.",
    authorEmailRequired: "An email is required for all authors.",
    duplicateEmail: "The same email cannot be used more than once within a paper.",
    exactlyOnePresenter: "You must select exactly one presenting author.",
    // Presentation validation
    presentationRequired: "Presentation type is required.",
    audienceRequired: "You must select your academic status.",
    // Registration
    sessionNotFound: "Session not found.",
    congressNotFound: "Congress not found.",
    contextFailed: "Could not create the registration context.",
    nameRequired: "Full name is required.",
    selectPaperOrListener: "You must select a paper or register as a listener.",
    papersNotVerified: "Some of the selected papers could not be verified.",
    paymentAlready: "Payment has already been recorded for one of the selected papers.",
    amountFailed: "The amount could not be calculated.",
    receiptRequired: "You must upload a receipt.",
    receiptInvalid: "The receipt must be PDF, JPG, JPEG or PNG and must not exceed 10 MB.",
    studentDocInvalid:
      "The student certificate must be PDF, JPG, JPEG or PNG and must not exceed 10 MB.",
    // Fee calculation (calculateRegistration)
    paymentClosed: "Payment is no longer accepted because the registration period has ended.",
    audienceMissingForPapers: "Academic status information is missing for the papers.",
    paperTierNotFound: "No fee definition found for the paper ({title}).",
    listenerModeRequired: "You must select a presentation type for listener attendance.",
    listenerAudienceRequired: "You must select an academic status for in-person listeners.",
    listenerDayRequired: "You must select at least one day for listener attendance.",
    listenerTierNotFound: "No fee definition found for listener attendance.",
    submissionsClosed:
      "Paper submission has closed. Registration for accepted papers is still open.",
  },
} as const;
