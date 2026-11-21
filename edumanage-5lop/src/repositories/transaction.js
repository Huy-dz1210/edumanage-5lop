/**
 * LỚP 4 – REPOSITORY: transaction (giao dịch).
 * Các thao tác trong fn() hoặc thành công tất cả, hoặc huỷ toàn bộ nếu có lỗi (rollback).
 * Tương đương BEGIN TRANSACTION / COMMIT / ROLLBACK trong SQL Server.
 */
const store = require('../database');

async function transaction(fn) {
  if (store.inTransaction) return fn(); // giao dịch lồng nhau → dùng chung giao dịch ngoài
  const snapshot = store.snapshot();
  store.inTransaction = true;
  try {
    const result = await fn();
    store.inTransaction = false;
    await store.save(); // COMMIT
    return result;
  } catch (err) {
    store.rollbackTo(snapshot); // ROLLBACK
    store.inTransaction = false;
    throw err;
  }
}

module.exports = { transaction };
