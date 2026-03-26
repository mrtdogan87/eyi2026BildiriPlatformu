# GitHub, Neon ve Vercel Kurulumu

## 1. Yerel Hazırlık

- `.env` dosyasındaki `DATABASE_URL` ve `DIRECT_URL` değerlerini Neon bağlantı dizgisi ile doldurun.
- Resend API ayarlarını ücretsiz sağlayıcınızın bilgileri ile doldurun.
- `APP_BASE_URL` yerelde `http://localhost:3000`, production'da Vercel domain'i olmalı.

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
  - `RESEND_API_KEY`
  - `RESEND_SENDER_EMAIL`
  - `RESEND_SENDER_NAME`

## 5. Dosya Yükleme Notu

- Yüklenen DOCX dosyaları şu an uygulama dosya sistemine yazılıyor.
- Vercel üzerinde bu kalıcı depolama sayılmaz.
- İlk deploy demo amaçlıdır; kalıcı dosya arşivi için ileride Blob/S3 benzeri servis eklenmelidir.
