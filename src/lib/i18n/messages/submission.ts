export const submission = {
  tr: {
    // Hero + sayfa
    heroEyebrow: "Akademik Başvuru",
    heroTitle: "Bildiri Gönderimi",
    heroDefaultSubtitle:
      "23. Uluslararası Ekonometri, Yöneylem Araştırması ve İstatistik Sempozyumu",
    secureLinkSubtitle: "Güvenli bağlantı doğrulaması",
    continueDraftTitle: "Taslağa Devam Et",
    successSubtitle: "Gönderim tamamlandı",
    successCaption: "Bildiriniz başarıyla alındı.",
    successTitle: "Başvurunuz Alındı",
    successIntro:
      "Bildiriniz kongre değerlendirme sürecine aktarıldı. Yeni bir bildiri başlatabilir veya başvuru merkezine dönebilirsiniz.",
    newPaper: "Yeni Bildiri",
    applicationCenter: "Başvuru Merkezi",
    // Taslak bağlantı doğrulama (draft gate)
    draftGateIntro:
      "Taslağınıza geçmeden önce bağlantıyı doğruluyoruz. Devam ettiğinizde bağlantı aynı cihazda {minutes} dakika boyunca geçerli kalır.",
    draftGateNoToken: "Erişim bağlantısında gerekli doğrulama bilgisi bulunamadı.",
    draftGateInvalid:
      "Bu bağlantı geçersiz, süresi dolmuş veya daha önce kullanım süresi tamamlanmış görünüyor. Yeni bir taslak bağlantısı oluşturup tekrar deneyebilirsiniz.",
    backToStart: "Başlangıç Ekranına Dön",
    // ---- Taslak başlatma ----
    startDraftTitle: "Taslak Başlat",
    startDraftIntro:
      "E-postanıza gelen güvenli bağlantıyla aynı taslağa dönebilir, bildiriyi adım adım tamamlayabilirsiniz.",
    secondPaperNotice:
      "İkinci bildiriniz için de aynı e-posta adresini kullanmalısınız; sistem yazarları e-posta üzerinden eşleştirir.",
    emailPlaceholder: "ornek@universite.edu.tr",
    paperLanguageLabel: "Bildirinizin Dili",
    turkce: "Türkçe",
    ingilizce: "İngilizce",
    previewTitle: "Test için oluşturulan erişim linki",
    previewDesc:
      "Gerçek e-posta servisi bağlı olmadığı için bu link ekranda gösteriliyor. Tıklayarak taslağı açabilirsiniz.",
    openDraft: "Taslağı Aç",
    preparing: "Hazırlanıyor...",
    startDraftButton: "Taslağı Başlat",
    // ---- Adımlar ----
    step1: "Bildiri Bilgileri",
    step2: "Yazarlar",
    step3: "Sunum Bilgileri",
    step4: "Onay ve Gönder",
    next: "İleri",
    // ---- Adım 1: Bildiri bilgileri ----
    paperLangPill: "Bildiri Dili: {lang}",
    draftOwnerPill: "Taslak Sahibi: {email}",
    mainFile: "Ana Dosya",
    fileHint: "Sadece DOCX, maksimum 10 MB.",
    existingFile: " Mevcut dosya: {name}",
    titleTrLabel: "Başlık (Türkçe)",
    abstractTrLabel: "Özet (Türkçe)",
    keywordsTrLabel: "Anahtar Kelimeler (Türkçe)",
    titleEnLabel: "Başlık (İngilizce)",
    abstractEnLabel: "Özet (İngilizce)",
    keywordsEnLabel: "Anahtar Kelimeler (İngilizce)",
    keywordsPlaceholder: "Virgülle ayırın",
    // ---- Adım 2: Yazarlar ----
    authorN: "{n}. Yazar",
    presenterRadio: "Sunan yazar",
    delete: "Sil",
    fullNameLabel: "Ad Soyad",
    institutionLabel: "Kurum",
    countryLabel: "Ülke",
    addAuthor: "+ Yazar Ekle",
    // ---- Adım 3: Sunum bilgileri ----
    presentationModeLabel: "Sunum Şekli",
    inPersonMeta: "Etkinlik salonunda fiziksel sunum",
    onlineMeta: "Uzaktan sunum",
    sameFeeHint: "Yüz yüze ve çevrim içi sunumlarda aynı ücretlendirme uygulanır.",
    academicStatusLabel: "Akademik Statü",
    academicMeta: "Öğretim üyesi / araştırmacı",
    studentMeta: "Lisans / yüksek lisans / doktora",
    // ---- Adım 4: Onay ----
    paperFeeHeading: "Bildiri Ücreti",
    category: "Kategori",
    notDefined: "Tanımlı değil",
    forFirstPaper: "Birinci bildiri için",
    feeHint:
      "Ödeme tarihinizdeki dönem (erken veya geç) uygulanır. İkinci bildiriniz ücretsizdir.",
    noAudience:
      "Akademik statünüz seçili değil. Önceki adımda seçim yaparsanız tutar burada hesaplanır.",
    paymentInfoHeading: "Ödeme Bilgisi",
    paymentInfo1:
      "Katılımcılar, bildirilerinin hakem değerlendirme süreci sonucunda kabul edilmesinin ardından kayıt ücretini yatırmalıdır.",
    paymentInfo2:
      "Birden fazla bildiriniz kabul edilirse hepsini tek seferde, tek dekontla ödeyebilirsiniz.",
    submitPaper: "Bildiriyi Gönder",
    err: {
      participationRequired: "Sunum şekli ve akademik statü seçmelisiniz.",
      declarations: "Bildirinizi gönderebilmek için tüm beyanları onaylamalısınız.",
      draftCreateFailed: "Taslak oluşturulamadı.",
      detailsSaveFailed: "Bildiri bilgileri kaydedilemedi.",
      fileUploadFailed: "Dosya yüklenemedi.",
      authorsSaveFailed: "Yazar bilgileri kaydedilemedi.",
      participationSaveFailed: "Sunum bilgileri kaydedilemedi.",
      submitFailed: "Bildiri gönderilemedi.",
    },
  },
  en: {
    // Hero + page
    heroEyebrow: "Academic Application",
    heroTitle: "Paper Submission",
    heroDefaultSubtitle:
      "23rd International Symposium on Econometrics, Operations Research and Statistics",
    secureLinkSubtitle: "Secure link verification",
    continueDraftTitle: "Continue Your Draft",
    successSubtitle: "Submission complete",
    successCaption: "Your paper has been received successfully.",
    successTitle: "Your Application Was Received",
    successIntro:
      "Your paper has been moved into the congress review process. You can start a new paper or return to the application center.",
    newPaper: "New Paper",
    applicationCenter: "Application Center",
    // Draft link verification (draft gate)
    draftGateIntro:
      "We verify the link before opening your draft. Once you continue, the link stays valid on the same device for {minutes} minutes.",
    draftGateNoToken: "The required verification info was not found in the access link.",
    draftGateInvalid:
      "This link appears invalid, expired, or already used. You can create a new draft link and try again.",
    backToStart: "Back to Start Screen",
    // ---- Start draft ----
    startDraftTitle: "Start Draft",
    startDraftIntro:
      "Using the secure link sent to your email, you can return to the same draft and complete your paper step by step.",
    secondPaperNotice:
      "You must use the same email address for your second paper as well; the system matches authors via email.",
    emailPlaceholder: "example@university.edu",
    paperLanguageLabel: "Language of Your Paper",
    turkce: "Turkish",
    ingilizce: "English",
    previewTitle: "Access link generated for testing",
    previewDesc:
      "Since no real email service is connected, this link is shown on screen. Click it to open the draft.",
    openDraft: "Open Draft",
    preparing: "Preparing...",
    startDraftButton: "Start Draft",
    // ---- Steps ----
    step1: "Paper Details",
    step2: "Authors",
    step3: "Presentation Details",
    step4: "Confirm and Submit",
    next: "Next",
    // ---- Step 1: Paper details ----
    paperLangPill: "Paper Language: {lang}",
    draftOwnerPill: "Draft Owner: {email}",
    mainFile: "Main File",
    fileHint: "DOCX only, maximum 10 MB.",
    existingFile: " Current file: {name}",
    titleTrLabel: "Title (Turkish)",
    abstractTrLabel: "Abstract (Turkish)",
    keywordsTrLabel: "Keywords (Turkish)",
    titleEnLabel: "Title (English)",
    abstractEnLabel: "Abstract (English)",
    keywordsEnLabel: "Keywords (English)",
    keywordsPlaceholder: "Separate with commas",
    // ---- Step 2: Authors ----
    authorN: "Author {n}",
    presenterRadio: "Presenting author",
    delete: "Delete",
    fullNameLabel: "Full Name",
    institutionLabel: "Institution",
    countryLabel: "Country",
    addAuthor: "+ Add Author",
    // ---- Step 3: Presentation details ----
    presentationModeLabel: "Presentation Type",
    inPersonMeta: "Physical presentation in the event hall",
    onlineMeta: "Remote presentation",
    sameFeeHint: "The same fee applies to both in-person and online presentations.",
    academicStatusLabel: "Academic Status",
    academicMeta: "Faculty member / researcher",
    studentMeta: "Undergraduate / master's / doctorate",
    // ---- Step 4: Confirmation ----
    paperFeeHeading: "Paper Fee",
    category: "Category",
    notDefined: "Not defined",
    forFirstPaper: "For the first paper",
    feeHint:
      "The period on your payment date (early or late) applies. Your second paper is free.",
    noAudience:
      "Your academic status is not selected. If you make a selection in the previous step, the amount will be calculated here.",
    paymentInfoHeading: "Payment Information",
    paymentInfo1:
      "Participants must pay the registration fee after their papers are accepted as a result of the peer review process.",
    paymentInfo2:
      "If more than one of your papers is accepted, you can pay for all of them at once with a single receipt.",
    submitPaper: "Submit Paper",
    err: {
      participationRequired: "You must select a presentation type and academic status.",
      declarations: "You must approve all declarations to submit your paper.",
      draftCreateFailed: "The draft could not be created.",
      detailsSaveFailed: "Paper details could not be saved.",
      fileUploadFailed: "The file could not be uploaded.",
      authorsSaveFailed: "Author details could not be saved.",
      participationSaveFailed: "Presentation details could not be saved.",
      submitFailed: "The paper could not be submitted.",
    },
  },
} as const;
