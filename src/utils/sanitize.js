import DOMPurify from "dompurify";

export const sanitizeText = (value) => {
  if (value === null || value === undefined) return "";

  return DOMPurify.sanitize(String(value), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

export const sanitizeTextTrim = (value) => sanitizeText(value).trim();
