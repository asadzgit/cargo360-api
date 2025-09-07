'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      // Review belongs to a Shipment
      Review.belongsTo(models.Shipment, { foreignKey: 'shipmentId', as: 'Shipment' });

      // Review belongs to Reviewer (User)
      Review.belongsTo(models.User, { foreignKey: 'reviewerId', as: 'Reviewer' });

      // Review belongs to Reviewee (User)
      Review.belongsTo(models.User, { foreignKey: 'revieweeId', as: 'Reviewee' });
    }
  }
  Review.init({
    shipmentId: DataTypes.INTEGER,
    reviewerId: DataTypes.INTEGER,
    revieweeId: DataTypes.INTEGER,
    rating: DataTypes.INTEGER,
    comment: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Review',
  });
  return Review;
};
