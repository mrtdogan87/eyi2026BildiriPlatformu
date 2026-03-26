# GitHub, Neon ve Vercel Kurulumu

## 1. Yerel Hazırlık

- `.env` dosyasındaki `DATABASE_URL` ve `DIRECT_URL` değerlerini Neon bağlantı dizgisi ile doldurun.
- Resend API ayarlarını ücretsiz sağlayıcınızın bilgileri ile doldurun.
- `APP_BASE_URL` yerelde `http://localhost:3000`, production'da Vercel domain'i olmalı.
- Yönetim paneli için `ADMIN_PASSWORD` ve `ADMIN_SESSION_SECRET` değerlerini de tanımlayın.

## 2. Neon

- Yeni bir PostgreSQL veritabanı oluşturun.
- Connection string içinden `DATABASE_URL` ve `DIRECT_URL` değerlerini alın.
- Şemayı uygulamak için:

```bash
npm install
npm run prisma:migrate:deploy
```

## 3. GitHub

- Repo'yu private oluşturun.
- İlk push için:

```bash
git remote add origin <github-repo-url>
git branch -M main
git push -u origin main
```

## 4. Vercel

- Projeyi GitHub üzerinden import edin.
- Build command olarak `npm run vercel-build` kullanın.
- Aşağıdaki environment variable'ları ekleyin:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `APP_BASE_URL`
  - `DRAFT_SESSION_SECRET`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `RESEND_API_KEY`
  - `RESEND_SENDER_EMAIL`
  - `RESEND_SENDER_NAME`

## 5. Dosya Yükleme Notu

- Yüklenen DOCX dosyaları şu an PostgreSQL veritabanında saklanıyor.
- Bu sayede Vercel dosya sistemi sınırlaması aşılmış durumda.
- Uzun vadede daha büyük arşiv ihtiyacı için Blob/S3 benzeri obje depolama yine değerlendirilebilir.
