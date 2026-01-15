const { MobileAppConfig } = require('../../models');
const { compareVersions, isValidVersion } = require('../utils/versionCompare');

/**
 * GET /admin/mobile-config
 * Get all mobile app configurations
 */
exports.getMobileConfigs = async (req, res, next) => {
  try {
    const configs = await MobileAppConfig.findAll({
      order: [['platform', 'ASC']]
    });
    res.json({ configs });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/mobile-config/:platform
 * Get mobile app configuration for a specific platform
 */
exports.getMobileConfig = async (req, res, next) => {
  try {
    const { platform } = req.params;
    
    if (!['android', 'ios'].includes(platform.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid platform. Must be "android" or "ios"',
        code: 4001
      });
    }

    const config = await MobileAppConfig.findOne({
      where: { platform: platform.toLowerCase() }
    });

    if (!config) {
      return res.status(404).json({
        error: `No configuration found for platform: ${platform}`,
        code: 4041
      });
    }

    res.json({ config });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /admin/mobile-config/:platform
 * Update mobile app configuration for a specific platform
 */
exports.updateMobileConfig = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { minSupportedVersion, latestVersion, forceUpdate, storeUrl } = req.body;

    if (!['android', 'ios'].includes(platform.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid platform. Must be "android" or "ios"',
        code: 4001
      });
    }

    // Validate versions
    if (minSupportedVersion !== undefined && !isValidVersion(minSupportedVersion)) {
      return res.status(400).json({
        error: 'Invalid minSupportedVersion format. Must be semantic version (x.y.z)',
        code: 4002
      });
    }

    if (latestVersion !== undefined && !isValidVersion(latestVersion)) {
      return res.status(400).json({
        error: 'Invalid latestVersion format. Must be semantic version (x.y.z)',
        code: 4003
      });
    }

    // Find or create config
    let config = await MobileAppConfig.findOne({
      where: { platform: platform.toLowerCase() }
    });

    const updateData = {};
    if (minSupportedVersion !== undefined) updateData.minSupportedVersion = minSupportedVersion;
    if (latestVersion !== undefined) updateData.latestVersion = latestVersion;
    if (forceUpdate !== undefined) updateData.forceUpdate = Boolean(forceUpdate);
    if (storeUrl !== undefined) updateData.storeUrl = storeUrl;

    // Validate that minSupportedVersion <= latestVersion
    const finalMinVersion = updateData.minSupportedVersion || config?.minSupportedVersion;
    const finalLatestVersion = updateData.latestVersion || config?.latestVersion;

    if (finalMinVersion && finalLatestVersion && compareVersions(finalMinVersion, finalLatestVersion) > 0) {
      return res.status(400).json({
        error: 'minSupportedVersion cannot be greater than latestVersion',
        code: 4004
      });
    }

    if (config) {
      await config.update(updateData);
    } else {
      // Create new config if it doesn't exist
      if (!minSupportedVersion || !latestVersion || !storeUrl) {
        return res.status(400).json({
          error: 'Missing required fields for new config: minSupportedVersion, latestVersion, storeUrl',
          code: 4005
        });
      }
      config = await MobileAppConfig.create({
        platform: platform.toLowerCase(),
        minSupportedVersion,
        latestVersion,
        forceUpdate: forceUpdate || false,
        storeUrl
      });
    }

    res.json({
      success: true,
      message: 'Mobile app configuration updated successfully',
      config
    });
  } catch (error) {
    next(error);
  }
};


