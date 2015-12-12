'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  path = require('path'),
  db = require(path.resolve('./config/lib/sequelize'));

module.exports = function () {
  // Use local strategy
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function (username, password, done) {
    db.User.find({
      where : { username: username.toLowerCase() }
    }).then(function (user) {
      if (!user || !user.authenticate(password)) {
        return done(null, false, {
          message: 'Invalid username or password'
        });
      }
      return done(null, user);
    }).catch(function (err) {
      return done(err);
    });
  }));
};
