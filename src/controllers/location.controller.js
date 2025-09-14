const { ShipmentLocation, Shipment, User } = require('../../models');
const { locationTrackingSchema } = require('../validation/location.schema');

// Track driver location during shipment
exports.trackLocation = async (req, res, next) => {
  try {
    const { id: shipmentId } = req.params;
    const driverId = req.user.id;
    
    // Validate request body
    const { error, value } = locationTrackingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        code: 4000,
        status: 400
      });
    }

    // Check if shipment exists and driver is assigned
    const shipment = await Shipment.findOne({
      where: { 
        id: shipmentId,
        driverId: driverId,
        status: ['in_transit', 'picked_up'] // Only track during active journey
      }
    });

    if (!shipment) {
      return res.status(404).json({
        error: 'Shipment not found or not in trackable status',
        code: 4004,
        status: 404
      });
    }

    // Create location record
    const location = await ShipmentLocation.create({
      shipmentId: shipmentId,
      driverId: driverId,
      latitude: value.latitude,
      longitude: value.longitude,
      accuracy: value.accuracy,
      speed: value.speed,
      heading: value.heading,
      timestamp: value.timestamp
    });

    res.status(201).json({
      success: true,
      message: 'Location tracked successfully',
      data: {
        location: {
          id: location.id,
          shipmentId: location.shipmentId,
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          accuracy: location.accuracy ? parseFloat(location.accuracy) : null,
          speed: location.speed ? parseFloat(location.speed) : null,
          heading: location.heading ? parseFloat(location.heading) : null,
          timestamp: location.timestamp,
          createdAt: location.createdAt
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get location history for a shipment
exports.getLocationHistory = async (req, res, next) => {
  try {
    const { id: shipmentId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if user has access to this shipment
    const whereClause = { id: shipmentId };
    if (req.user.role === 'customer') {
      whereClause.customerId = req.user.id;
    } else if (req.user.role === 'trucker') {
      whereClause.truckerId = req.user.id;
    } else if (req.user.role === 'driver') {
      whereClause.driverId = req.user.id;
    }
    // Admin can access any shipment

    const shipment = await Shipment.findOne({
      where: whereClause
    });

    if (!shipment) {
      return res.status(404).json({
        error: 'Shipment not found or unauthorized',
        code: 4004,
        status: 404
      });
    }

    // Get location history
    const locations = await ShipmentLocation.findAll({
      where: { shipmentId: shipmentId },
      include: [
        {
          model: User,
          as: 'Driver',
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedLocations = locations.map(loc => ({
      id: loc.id,
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
      speed: loc.speed ? parseFloat(loc.speed) : null,
      heading: loc.heading ? parseFloat(loc.heading) : null,
      timestamp: loc.timestamp,
      createdAt: loc.createdAt,
      driver: loc.Driver
    }));

    res.json({
      success: true,
      data: {
        shipmentId: parseInt(shipmentId),
        locations: formattedLocations,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: locations.length
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get current/latest location for a shipment
exports.getCurrentLocation = async (req, res, next) => {
  try {
    const { id: shipmentId } = req.params;

    // Check if user has access to this shipment
    const whereClause = { id: shipmentId };
    if (req.user.role === 'customer') {
      whereClause.customerId = req.user.id;
    } else if (req.user.role === 'trucker') {
      whereClause.truckerId = req.user.id;
    } else if (req.user.role === 'driver') {
      whereClause.driverId = req.user.id;
    }
    // Admin can access any shipment

    const shipment = await Shipment.findOne({
      where: whereClause
    });

    if (!shipment) {
      return res.status(404).json({
        error: 'Shipment not found or unauthorized',
        code: 4004,
        status: 404
      });
    }

    // Get latest location
    const location = await ShipmentLocation.findOne({
      where: { shipmentId: shipmentId },
      include: [
        {
          model: User,
          as: 'Driver',
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['timestamp', 'DESC']]
    });

    if (!location) {
      return res.json({
        success: true,
        data: {
          shipmentId: parseInt(shipmentId),
          currentLocation: null,
          message: 'No location data available for this shipment'
        }
      });
    }

    res.json({
      success: true,
      data: {
        shipmentId: parseInt(shipmentId),
        currentLocation: {
          id: location.id,
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          accuracy: location.accuracy ? parseFloat(location.accuracy) : null,
          speed: location.speed ? parseFloat(location.speed) : null,
          heading: location.heading ? parseFloat(location.heading) : null,
          timestamp: location.timestamp,
          createdAt: location.createdAt,
          driver: location.Driver
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
