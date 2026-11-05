# 🛠️ لوحة تحكم المحتوى (Decap CMS) — zlupos.com

> تعديل كل النصوص والصور والمعرض **بدون كود**، من `https://zlupos.com/admin/`،
> وكل حفظ = commit على GitHub = إعادة نشر تلقائية على Cloudflare Pages.

---

## 1) ما تم تجهيزه في المشروع

| الملف | الوظيفة |
|---|---|
| `admin/index.html` | صفحة لوحة التحكم — تستدعي `decap-cms@^3.0.0` من unpkg |
| `admin/config.yml` | الإعدادات الكاملة (backend github · المستودع · الحقول) |
| `content.json` | **مصدر المحتوى الوحيد**: النصوص · التواصل · الصور · عناوين الأقسام · المعرض |
| `index.html` | يقرأ `content.json` تلقائيًا عبر `fetch` ويحدّث النصوص/الصور/الروابط/المعرض |
| `cloudflare/oauth-worker.js` | وسيط OAuth (Cloudflare Worker) — ضروري لتسجيل الدخول من GitHub |

**الموقع يعمل بدون JavaScript أيضًا**: كل المحتوى الثابت موجود داخل `index.html` كنسخة احتياطية،
وإذا فشل تحميل `content.json` يبقى المحتوى الظاهر كما هو (لا صفحة بيضاء).

---

## 2) الخطوات اللازمة لتفعيل الدخول (مرة واحدة فقط)

### أ) أنشئ GitHub OAuth App
GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**

| الحقل | القيمة |
|---|---|
| Application name | `zlupos-cms` |
| Homepage URL | `https://zlupos.com` |
| Authorization callback URL | `https://zlupos-cms-oauth.<your-subdomain>.workers.dev/callback` |

احفظ `Client ID` و `Client Secret`.

### ب) انشر وسيط OAuth على Cloudflare Workers
```bash
npx wrangler login
npx wrangler deploy --config cloudflare/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_ID     --config cloudflare/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config cloudflare/wrangler.toml
```
> ⚠️ لا يعمل Cloudflare Pages على تشغيل هذا الوسيط تلقائيًا — يجب نشر الـ Worker مرة واحدة.
> بعد النشر سيصبح الرابط: `https://zlupos-cms-oauth.<account>.workers.dev`

### ج) اضبط رابط الوسيط في الإعدادات
في `admin/config.yml`:
```yaml
backend:
  base_url: https://zlupos-cms-oauth.<your-subdomain>.workers.dev
```

### د) ثبّت المشروع على Cloudflare Pages
| الإعداد | القيمة |
|---|---|
| Framework preset | None |
| Build command | *(فارغ)* |
| Build output directory | `/` |
| Repository | `zlupos/zlupos` · Branch `main` |

بعد أول نشرة → `https://zlupos.com/admin/` → **Login with GitHub**.

---

## 3) التعديل المحلي بدون OAuth

```bash
npx decap-server          # يشغّل وسيطًا محليًا على المنفذ 8081
# اجعل local_backend: true في admin/config.yml
# ثم شغّل أي سيرفر ثابت للموقع وافتح /admin/
npx serve .
```

---

## 4) ملاحظات مهمة

1. **مجموعة واحدة فقط** في `config.yml` تقرأ وتكتب `content.json` — لأن Decap يكتب الملف كاملًا عند كل حفظ،
   فتعدّد المجموعات على نفس الملف يُفقد البيانات. الحقول مقسّمة داخليًا (نصوص · تواصل · صور · عناوين · معرض).
2. **الترتيب في المعرض** = ترتيب العناصر في `content.json` (اسحب وأفلت في اللوحة).
3. **رفع صورة بنفس الاسم** يستبدل الصورة القديمة (سلوك `media_folder: "."`).
4. **تغيير رقم الهاتف أو روابط التواصل لا يعيد توليد رموز QR** تلقائيًا — استبدل صور `assets/qr-*.png`
   من اللوحة (حقل «رمز QR») بعد توليدها من جديد.
5. **صورة vCard** تُضمَّن Base64 داخل ملف `.vcf`، لذا يُفضّل ألا تتجاوز ~200KB.
6. `og:title` يتحدّث من الاسم الإنجليزي؛ أما `og:image` و`canonical` فثابتان على `zlupos.com`.
