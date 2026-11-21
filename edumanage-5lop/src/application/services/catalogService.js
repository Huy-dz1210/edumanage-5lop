/** LỚP 2 – APPLICATION / SERVICE: use case lấy danh mục dùng chung (khoa, học kỳ, thang điểm...). */
const catalogBusiness = require('../../domain/business/catalogBusiness');
const { authorize } = require('../../domain/policies/permissionPolicy');

async function getCatalog(user) {
  authorize(user, 'catalog.read');
  return catalogBusiness.getCatalog();
}

module.exports = { getCatalog };
