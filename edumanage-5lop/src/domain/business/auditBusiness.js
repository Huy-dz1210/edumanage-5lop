/** LỚP 3 – DOMAIN: ghi và tra cứu nhật ký thao tác. */
const { auditLogRepository } = require('../../repositories');

async function record(actor, action, detail = '') {
  await auditLogRepository.add({
    at: new Date().toISOString(),
    user: actor ? actor.username : 'system',
    action,
    detail,
  });
}

const search = (filters) => auditLogRepository.search(filters);

module.exports = { record, search };
