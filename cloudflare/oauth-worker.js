/**
 * ═══════════════════════════════════════════════════════════════
 *  Decap CMS — GitHub OAuth proxy (Cloudflare Worker)
 *  ضروري لأن Decap CMS يحتاج وسيطًا لتبادل كود GitHub بـ token.
 *
 *  النشر:
 *    1) أنشئ GitHub OAuth App:
 *       Settings → Developer settings → OAuth Apps → New OAuth App
 *       Homepage URL              : https://zlupos.com
 *       Authorization callback URL: https://<WORKER>.workers.dev/callback
 *    2) wrangler deploy cloudflare/oauth-worker.js --name zlupos-cms-oauth
 *    3) wrangler secret put GITHUB_CLIENT_ID
 *       wrangler secret put GITHUB_CLIENT_SECRET
 *    4) ضع رابط الـ Worker في admin/config.yml → backend.base_url
 * ═══════════════════════════════════════════════════════════════
 */

const PROVIDER = 'github';
const SCOPE = 'repo,user';

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // ── 1) بدء التفويض ─────────────────────────────────────────
    if (path === '/auth') {
      if (!env.GITHUB_CLIENT_ID) return html('<h3>GITHUB_CLIENT_ID غير مضبوط</h3>', 500);
      const redirectUri = `${url.origin}/callback`;
      const authorize = new URL('https://github.com/login/oauth/authorize');
      authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorize.searchParams.set('redirect_uri', redirectUri);
      authorize.searchParams.set('scope', SCOPE);
      authorize.searchParams.set('state', crypto.randomUUID());
      return Response.redirect(authorize.toString(), 302);
    }

    // ── 2) استلام الكود وتسليم التوكن للوحة التحكم ─────────────
    if (path === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return html('<h3>لم يصل كود التفويض من GitHub</h3>', 400);

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code
        })
      });
      const data = await tokenRes.json();

      const payload = data.error
        ? { error: data.error, error_description: data.error_description || '' }
        : { token: data.access_token, provider: PROVIDER };

      const status = data.error ? 'error' : 'success';
      const message = `authorization:${PROVIDER}:${status}:${JSON.stringify(payload)}`;

      // نُبلّغ النافذة الأم (Decap) ثم نغلق النافذة
      return html(`<!doctype html><meta charset="utf-8"><title>OAuth</title>
<script>
  (function () {
    var msg = ${JSON.stringify(message)};
    function receive(e) {
      if (window.opener) { window.opener.postMessage(msg, e.origin || '*'); }
      setTimeout(function () { window.close(); }, 500);
    }
    window.addEventListener('message', receive, false);
    if (window.opener) { window.opener.postMessage('authorizing:${PROVIDER}', '*'); }
  })();
</script>
<p style="font-family:system-ui;padding:24px">تم التفويض — يمكنك إغلاق هذه النافذة.</p>`);
    }

    // ── فحص الصحة ─────────────────────────────────────────────
    if (path === '/' || path === '/health') {
      return html('<h3>zlupos-cms-oauth</h3><p>OK — endpoint: /auth</p>');
    }

    return html('<h3>404</h3>', 404);
  }
};
