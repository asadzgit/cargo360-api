const { MobileAppConfig } = require('../../models');
const { compareVersions, isValidVersion } = require('../utils/versionCompare');

/**
 * GET /mobile/app-version
 * Checks if the app version is supported
 * Headers: Platform (android|ios), App-Version (x.y.z)
 */
exports.checkAppVersion = async (req, res, next) => {
  try {
    const platform = (req.headers['platform'] || req.headers['Platform'])?.toLowerCase();
    const appVersion = req.headers['app-version'];

    // Validate headers
    if (!platform || !['android', 'ios'].includes(platform)) {
      return res.status(400).json({
        error: 'Invalid or missing Platform header. Must be "android" or "ios"',
        code: 4001
      });
    }

    if (!appVersion) {
      return res.status(400).json({
        error: 'Missing App-Version header',
        code: 4002
      });
    }

    if (!isValidVersion(appVersion)) {
      return res.status(400).json({
        error: 'Invalid App-Version format. Must be semantic version (x.y.z)',
        code: 4003
      });
    }

    // Fetch config for platform
    const config = await MobileAppConfig.findOne({
      where: { platform }
    });

    if (!config) {
      return res.status(404).json({
        error: `No configuration found for platform: ${platform}`,
        code: 4041
      });
    }

    const { minSupportedVersion, latestVersion, forceUpdate, storeUrl } = config;

    // Compare versions
    const compareToMin = compareVersions(appVersion, minSupportedVersion);
    const compareToLatest = compareVersions(appVersion, latestVersion);

    // Determine if update is required and if it's forced
    let updateRequired = false;
    let force = false;

    // If app version is below minimum supported version, force update
    if (compareToMin < 0) {
      updateRequired = true;
      force = true;
    }
    // If app version is below latest version, update recommended (not forced unless forceUpdate flag is set)
    else if (compareToLatest < 0) {
      updateRequired = true;
      force = forceUpdate; // Use the forceUpdate flag from config
    }

    res.json({
      updateRequired,
      force,
      minSupportedVersion,
      latestVersion,
      storeUrl
    });
  } catch (error) {
    next(error);
  }
};

