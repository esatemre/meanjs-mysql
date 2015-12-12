'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
  path = require('path'),
  db = require(path.resolve('./config/lib/sequelize'));

/**
 * User middleware
 */
exports.userByID = function (req, res, next, id) {
  db.User.find({ where : { id: id } }).then(function(user){
    if (!user) {
      return next(new Error('Failed to load User ' + id));
    }
    req.profile = user;
    next();
  }).catch(function(err){
    return next(err);
  });
};
