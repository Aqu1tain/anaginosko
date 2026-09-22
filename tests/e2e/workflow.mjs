import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function runEditorialHttp(base, mailLog) {
  const url = new URL(base);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Recette locale uniquement');
  let checks = 0;
  async function call(route, actor, method = 'GET', data, expected = 200) {
    const response = await fetch(base + route, {
      method, headers: { ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}), 'Content-Type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(60000),
    });
    const body = await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(body.error ?? body.errors ?? '')}`);
    checks++; return body;
  }
  const login = name => call('/api/login', null, 'POST', { email: `${name}@example.test`, password: 'local-e2e-password' });
  const author = await login('author'), reviewer = await login('reviewer'), publisher = await login('publisher'), manager = await login('manager'), outsider = await login('outsider');
  assert.deepEqual(author.user.permissions, ['articles']);
  assert.deepEqual(reviewer.user.permissions, ['review']);
  assert.deepEqual(publisher.user.permissions, ['publish']);
  await call('/api/admin/users', reviewer, 'GET', undefined, 403);
  const directory = await call('/admin/articles/api/reviewers', author);
  assert.ok(!JSON.stringify(directory).includes('@example.test'));
  let a = (await call('/admin/articles/api/articles', author, 'POST', { title: 'Recette complète éditoriale', category: 'philologie' }, 201)).article;
  const route = `/admin/articles/api/articles/${a.id}`;
  const save = async data => { a = (await call(route, author, 'PUT', { rev: a.rev, ...data })).article; };
  const transition = async (action, actor, data = {}, expected = 200) => {
    const body = await call(route + '/status', actor, 'POST', { action, rev: a.rev, ...data }, expected);
    if (body.article) a = body.article;
  };
  const content = text => [{ id: 'e2e-paragraph', type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] }];
  await save({ content: content('Texte public initial, vérifié par un autre compte.') });
  await call(route, outsider, 'GET', undefined, 403);
  await call(route, reviewer, 'PUT', { rev: a.rev, title: 'Modification interdite' }, 401);
  await transition('submit', author, { reviewerId: author.user.id }, 400);
  await transition('submit', author, { reviewerId: reviewer.user.id, note: 'Vérifier la source E2E.' });
  assert.equal(a.reviewRequest.notification, 'sent');
  const sent = fs.readFileSync(mailLog, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'reviewer@example.test');
  assert.ok(sent[0].text.includes(`${base}/admin/articles/${a.id}`));
  await transition('retry_notification', author);
  assert.equal(fs.readFileSync(mailLog, 'utf8').trim().split('\n').length, 1);
  await transition('approve', author, {}, 403);
  await transition('approve', publisher, {}, 403);
  a = (await call(route + '/comments', reviewer, 'POST', { text: 'Note interne secrète E2E', blockId: 'e2e-paragraph', quote: 'Texte public initial', revision: a.contentRevision }, 201)).article;
  const first = a.comments.at(-1);
  a = (await call(route + '/comments', publisher, 'POST', { text: 'Vérification de publication', threadId: first.threadId }, 201)).article;
  await call(route + '/comments', author, 'PATCH', { commentId: first.id, text: 'Usurpation' }, 403);
  a = (await call(route + '/comments', reviewer, 'PATCH', { threadId: first.threadId, resolved: true })).article;
  assert.ok(a.comments.every(c => c.resolved));
  await transition('request_changes', reviewer, { note: 'Préciser la source.' });
  await save({ excerpt: 'Source précisée.' });
  await transition('submit', author);
  await transition('approve', reviewer);
  await transition('publish', reviewer, {}, 403);
  await call(`/api/admin/users/${reviewer.user.id}`, manager, 'PATCH', { active: false });
  await transition('publish', publisher, {}, 409);
  await call(`/api/admin/users/${reviewer.user.id}`, manager, 'PATCH', { active: true });
  await transition('publish', publisher);
  const slug = a.slug;
  const publicPage = async () => {
    const r = await fetch(`${base}/articles/${slug}`, { signal: AbortSignal.timeout(60000) });
    assert.equal(r.status, 200); checks++; return r.text();
  };
  let html = await publicPage();
  assert.ok(html.includes('Texte public initial'));
  assert.ok(!html.includes('Note interne secrète E2E'));
  await transition('revise', author);
  await save({ title: 'Recette corrigée', content: content('Nouvelle version confidentielle E2E') });
  html = await publicPage();
  assert.ok(html.includes('Texte public initial'));
  assert.ok(!html.includes('Nouvelle version confidentielle E2E'));
  await call(route, author, 'PUT', { rev: a.rev - 1, title: 'Écriture périmée' }, 409);
  const freshReviewer = await login('reviewer');
  await transition('submit', author);
  await transition('approve', freshReviewer);
  await save({ excerpt: 'Dernière modification après approbation.' });
  assert.equal(a.status, 'draft'); assert.equal(a.approval, null);
  await transition('publish', publisher, {}, 409);
  await transition('submit', author);
  await transition('approve', freshReviewer);
  await transition('publish', publisher);
  assert.equal(a.slug, slug);
  html = await publicPage();
  assert.ok(html.includes('Nouvelle version confidentielle E2E'));
  assert.ok(!html.includes('Note interne secrète E2E'));
  assert.ok(a.versions.length >= 3);
  await call('/api/admin/invitations', manager, 'POST', { email: 'invite@example.test', displayName: 'Invité E2E', roleIds: [2] }, 201);
  const invitation = fs.readFileSync(mailLog, 'utf8').trim().split('\n').map(JSON.parse).at(-1);
  const token = invitation.text.match(/\/invitation\/([A-Za-z0-9_-]+)/)[1];
  const responses = await Promise.all([1, 2].map(() => fetch(`${base}/api/invitations/${token}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'local-e2e-password' }) })));
  const statuses = responses.map(r => r.status).sort();
  assert.equal(statuses[0], 201); assert.ok([400, 409].includes(statuses[1]), `Invitation concurrente : ${statuses}`); checks += 2;
  const users = (await call('/api/admin/users', manager)).users;
  assert.equal(users.filter(u => u.email === 'invite@example.test').length, 1);
  console.log(`E2E HTTP réussi : ${checks} requêtes vérifiées ; rôles, invitations concurrentes, notification simulée, discussions, relecture, publication, révocation, révision publique et conflits.`);
}
