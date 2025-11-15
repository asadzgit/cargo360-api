const serializeValue = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  return value ?? null;
};

const valuesAreEqual = (a, b) => {
  const serializedA = serializeValue(a);
  const serializedB = serializeValue(b);

  if (typeof serializedA === 'object' && typeof serializedB === 'object') {
    return JSON.stringify(serializedA) === JSON.stringify(serializedB);
  }

  return serializedA === serializedB;
};

/**
 * Builds a diff object between previous and current values.
 * @param {Object} previous
 * @param {Object} current
 * @param {Object} options
 * @param {string[]} options.ignore - fields to ignore
 * @param {string[]} options.fields - optional whitelist of fields to inspect
 * @returns {Object} diff - { fieldName: { old, new } }
 */
const buildDiff = (previous = {}, current = {}, options = {}) => {
  const ignore = options.ignore || [];
  const fields = options.fields && options.fields.length
    ? options.fields
    : Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]));

  return fields.reduce((acc, field) => {
    if (ignore.includes(field)) return acc;

    const prevValue = previous[field];
    const currValue = current[field];

    if (valuesAreEqual(prevValue, currValue)) {
      return acc;
    }

    acc[field] = {
      old: serializeValue(prevValue),
      new: serializeValue(currValue)
    };

    return acc;
  }, {});
};

module.exports = {
  buildDiff,
  serializeValue
};

