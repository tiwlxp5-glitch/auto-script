export class Logger {
  constructor(reqId, userId = null) {
    // Cloudflare Pages edge functions support crypto.randomUUID()
    this.reqId = reqId || crypto.randomUUID();
    this.userId = userId;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  _log(level, message, context = {}, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      reqId: this.reqId,
      userId: this.userId,
      message,
      ...context
    };

    if (error) {
      logEntry.error = error.message || String(error);
      if (error.stack) {
        logEntry.stack = error.stack;
      }
    }

    const logString = JSON.stringify(logEntry);
    
    switch(level) {
      case 'INFO':
        console.log(logString);
        break;
      case 'WARN':
        console.warn(logString);
        break;
      case 'ERROR':
        console.error(logString);
        break;
      default:
        console.log(logString);
    }
  }

  info(message, context = {}) {
    this._log('INFO', message, context);
  }

  warn(message, context = {}) {
    this._log('WARN', message, context);
  }

  error(message, error = null, context = {}) {
    this._log('ERROR', message, context, error);
  }
}
