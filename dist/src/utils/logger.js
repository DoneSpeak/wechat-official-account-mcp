export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["TRACE"] = 0] = "TRACE";
    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
})(LogLevel || (LogLevel = {}));
const SENSITIVE_FIELDS = [
    'appSecret',
    'app_secret',
    'secret',
    'accessToken',
    'access_token',
    'token',
    'encodingAesKey',
    'encoding_aes_key',
    'password',
    'apiKey',
    'api_key',
];
function sanitizeValue(value) {
    if (typeof value === 'string') {
        return value.length > 16
            ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
            : value;
    }
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
            const isSensitive = SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()));
            sanitized[key] = isSensitive ? '***' : sanitizeValue(val);
        }
        return sanitized;
    }
    return value;
}
class Logger {
    constructor() {
        Object.defineProperty(this, "level", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: LogLevel.INFO
        });
    }
    setLevel(level) {
        this.level = level;
    }
    log(level, message, ...args) {
        if (level >= this.level) {
            const timestamp = new Date().toISOString();
            const levelName = LogLevel[level];
            const sanitizedArgs = args.map(arg => sanitizeValue(arg));
            console.error(`[${timestamp}] [${levelName}] ${message}`, ...sanitizedArgs);
        }
    }
    trace(message, ...args) {
        this.log(LogLevel.TRACE, message, ...args);
    }
    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }
    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }
    warn(message, ...args) {
        this.log(LogLevel.WARN, message, ...args);
    }
    error(message, ...args) {
        this.log(LogLevel.ERROR, message, ...args);
    }
}
export const logger = new Logger();
