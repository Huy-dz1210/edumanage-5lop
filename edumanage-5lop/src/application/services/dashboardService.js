/** LỚP 2 – APPLICATION / SERVICE: use case xem Dashboard (thống kê + hoạt động gần đây cho admin). */
const statisticsBusiness = require('../../domain/business/statisticsBusiness');
const audit = require('../../domain/business/auditBusiness');
const { authorize, can } = require('../../domain/policies/permissionPolicy');

async function overview(user) {
  authorize(user, 'dashboard.view');
  const [stats, recentActivity] = await Promise.all([
    statisticsBusiness.overview(user),
    can(user, 'system.manage') ? audit.search({ limit: 8 }) : [],
  ]);
  return { ...stats, recentActivity };
}

module.exports = { overview };
