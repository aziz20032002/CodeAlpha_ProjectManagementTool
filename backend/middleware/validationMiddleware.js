const { validationResult } = require("express-validator");

const validationErrorResponse = (res, errors) =>
  res.status(400).json({ message: "Validation failed", errors });

const handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((error) => ({
    field: error.path || "request",
    message: error.msg,
  }));
  return validationErrorResponse(res, errors);
};

const rejectUnknownFields = (allowedFields) => (req, res, next) => {
  if (req.body === undefined) return next();

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return validationErrorResponse(res, [
      { field: "body", message: "Request body must be a JSON object" },
    ]);
  }

  const unexpectedFields = Object.keys(req.body).filter(
    (field) => !allowedFields.includes(field),
  );
  if (unexpectedFields.length > 0) {
    return validationErrorResponse(
      res,
      unexpectedFields.map((field) => ({
        field,
        message: "Unexpected field",
      })),
    );
  }
  return next();
};

const requireAtLeastOneField = (allowedFields) => (req, res, next) => {
  const hasField = allowedFields.some((field) =>
    Object.prototype.hasOwnProperty.call(req.body, field),
  );
  if (!hasField) {
    return validationErrorResponse(res, [
      { field: "body", message: "Provide at least one editable field" },
    ]);
  }
  return next();
};

module.exports = {
  handleValidationErrors,
  rejectUnknownFields,
  requireAtLeastOneField,
};
