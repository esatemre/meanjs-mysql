'use strict';

/**
 * Module dependencies.
 */
var config = require('../config'),
  path = require('path'),
  _ = require('lodash'),
  Sequelize = require('sequelize'),
  db = {};


var sequelize = new Sequelize(config.db.name, config.db.username, config.db.password, config.db.options);

// Load the sequelize models
config.files.server.models.filter(function (file) {
  return (file.indexOf('.') !== 0) && (file !== 'index.js');
}).forEach(function (modelPath) {
  var model = sequelize.import(path.resolve(modelPath));
  db[model.name] = model;
});

Object.keys(db).forEach(function (modelName) {
  if (db[modelName].options.hasOwnProperty('associate')) {
    db[modelName].options.associate(db);
  }
});

/// Synchronizing any model changes with database.
// set FORCE_DB_SYNC=true in the environment, or the program parameters to drop the database,
//   and force model changes into it, if required;
// Caution: Do not set FORCE_DB_SYNC to true for every run to avoid losing data with restarts
sequelize
    .sync({
      force: false,
      logging: false
    })
    .then(function () {
      console.log('Database *DROPPED* and synchronized');
    }).catch(function (err) {
      console.log('An error occurred: ', err);
    });

// assign the sequelize variables to the db object and returning the db.
module.exports = _.extend({
  sequelize: sequelize,
  Sequelize: Sequelize
}, db);
