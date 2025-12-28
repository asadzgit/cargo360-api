/**
 * Compares two semantic versions (x.y.z format)
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} - Returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  // Ensure both versions have 3 parts (major.minor.patch)
  while (parts1.length < 3) parts1.push(0);
  while (parts2.length < 3) parts2.push(0);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] < parts2[i]) return -1;
    if (parts1[i] > parts2[i]) return 1;
  }
  
  return 0;
}

/**
 * Checks if version is valid semantic version format (x.y.z)
 * @param {string} version - Version string to validate
 * @returns {boolean}
 */
function isValidVersion(version) {
  if (!version || typeof version !== 'string') return false;
  return /^\d+\.\d+\.\d+$/.test(version.trim());
}

module.exports = {
  compareVersions,
  isValidVersion
};


