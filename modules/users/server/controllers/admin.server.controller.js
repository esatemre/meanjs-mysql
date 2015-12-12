'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  db = require(path.resolve('./config/lib/sequelize'));

/**
 * Show the current user
 */
exports.read = function (req, res) {
  res.jsonp(req.model || null);
};

/**
 * Update a User
 */
exports.update = function (req, res) {
  var user = req.model;

  user.updateAttributes({
    fullname: req.body.fullname
  }).then(function(a){
    return res.jsonp(a);
  }).catch(function(err){
    return res.render('error', {
      error: err,
      status: 500
    });
  });
};

/**
 * Delete a user
 */
exports.delete = function (req, res) {
  var user = req.model;

  user.destroy().then(function(){
    return res.jsonp(user);
  }).catch(function(err){
    return res.render('error', {
      error: err,
      status: 500
    });
  });
};

/**
 * List of Users
 */
exports.list = function (req, res) {
  db.User.findAll().then(function(users){
    return res.jsonp(users);
  }).catch(function(err){
    return res.render('error', {
      error: err,
      status: 500
    });
  });
};

/**
 * User middleware
 */
exports.userByID = function (req, res, next, id) {
  db.User.find({ where : { id: id } }).then(function(user){
    if (!user) {
      return next(new Error('Failed to load User ' + id));
    }
    req.model = user;
    next();
  }).catch(function(err){
    return next(err);
  });
};
