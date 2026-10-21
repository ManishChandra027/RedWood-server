import { randomUUID } from "node:crypto";

const safeFieldNames = new Set([
    "requestId",
    "method",
    "path",
    "statusCode",
    "durationMs",
    "errorName",
    "errorCode",
    "databaseHost",
    "port",
    "signal",
]);

const getRoutePattern = (req) => {
    const routePath = req?.route?.path;
    if (typeof routePath !== "string") return "<unmatched>";
    return `${req.baseUrl || ""}${routePath}`;
};

const writeLog = (level, event, fields = {}) => {
    const safeFields = Object.fromEntries(
        Object.entries(fields).filter(([key, value]) =>
            safeFieldNames.has(key) &&
            ["string", "number"].includes(typeof value) &&
            Number.isFinite(typeof value === "number" ? value : 0),
        ),
    );

    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event,
        ...safeFields,
    });

    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
};

const requestLogger = (req, res, next) => {
    const startedAt = performance.now();
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.once("finish", () => {
        writeLog("info", "http.request", {
            requestId: req.requestId,
            method: req.method,
            path: getRoutePattern(req),
            statusCode: res.statusCode,
            durationMs: Math.round(performance.now() - startedAt),
        });
    });
    next();
};

const logServerError = (error, req, statusCode) => {
    writeLog("error", "http.server_error", {
        requestId: req?.requestId,
        method: req?.method,
        path: getRoutePattern(req),
        statusCode,
        errorName: error?.name || "Error",
        errorCode: typeof error?.code === "number" ? error.code : undefined,
    });
};

const logServiceError = (event, error) =>
    writeLog("error", event, {
        errorName: error?.name || "Error",
        errorCode: typeof error?.code === "number" ? error.code : undefined,
    });

const logInfo = (event, fields) => writeLog("info", event, fields);

export { logInfo, logServerError, logServiceError, requestLogger, writeLog };
