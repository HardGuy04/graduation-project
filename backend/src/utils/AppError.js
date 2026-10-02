/**
 * Lỗi nghiệp vụ — controller/service throw instance này,
 * errorHandler middleware sẽ trả đúng status + code cho client.
 */
export default class AppError extends Error {
  /**
   * @param {number}  status  HTTP status code (400, 404, 409, …)
   * @param {string}  code    Mã lỗi ngắn (INVALID_INPUT, SLOT_TAKEN, …)
   * @param {string}  message Thông báo tiếng Việt cho client
   */
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code   = code;
  }
}
