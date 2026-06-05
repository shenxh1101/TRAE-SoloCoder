class ResponseUtil {
  static success(res, data = null, message = 'success') {
    return res.json({ code: 200, message, data, timestamp: Date.now() });
  }

  static error(res, message = 'error', code = 400, data = null) {
    return res.status(code >= 500 ? code : 200).json({ code, message, data, timestamp: Date.now() });
  }

  static paginate(res, { list, total, page, pageSize }) {
    return this.success(res, { list, total, page, pageSize, hasMore: page * pageSize < total });
  }
}

module.exports = ResponseUtil;
