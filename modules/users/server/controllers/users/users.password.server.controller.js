'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  config = require(path.resolve('./config/config')),
  db = require(path.resolve('./config/lib/sequelize')),
  nodemailer = require('nodemailer'),
  async = require('async'),
  crypto = require('crypto');

var smtpTransport = nodemailer.createTransport(config.mailer.options);

/**
 * Forgot for reset password (forgot POST)
 */
exports.forgot = function (req, res, next) {
  async.waterfall([
    // Generate random token
    function (done) {
      crypto.randomBytes(20, function (err, buffer) {
        var token = buffer.toString('hex');
        done(err, token);
      });
    },
    // Lookup user by username
    function (token, done) {
      if (req.body.username) {
        db.User.find({ where : { username: req.body.username.toLowerCase() } })
            .then(function (user) {
              if (!user) {
                return res.status(400).send({
                  message: 'No account with that username has been found'
                });
              } else if (user.provider !== 'local') {
                return res.status(400).send({
                  message: 'It seems like you signed up using your ' + user.provider + ' account'
                });
              } else {
                //Create Reset Token
                db.ResetPass.create({ token:token,userId:user.id }).then(function(reset){
                  if(!reset){
                    return res.status(400).send({
                      message: 'You cannot reset your password'
                    });
                  } else {
                    done(undefined, token, user);
                  }
                }).catch(function(err){
                  done(err, token, user);
                });
              }
            });
      } else {
        return res.status(400).send({
          message: 'Username field must not be blank'
        });
      }
    },
    function (token, user, done) {

      var httpTransport = 'http://';
      if (config.secure && config.secure.ssl === true) {
        httpTransport = 'https://';
      }
      res.render(path.resolve('modules/users/server/templates/reset-password-email'), {
        name: user.fullname,
        appName: config.app.title,
        url: httpTransport + req.headers.host + '/api/auth/reset/' + token
      }, function (err, emailHTML) {
        done(err, emailHTML, user);
      });
    },
    // If valid email, send reset email using service
    function (emailHTML, user, done) {
      var mailOptions = {
        to: user.email,
        from: config.mailer.from,
        subject: 'Password Reset',
        html: emailHTML
      };
      smtpTransport.sendMail(mailOptions, function (err) {
        if (!err) {
          res.send({
            message: 'An email has been sent to the provided email with further instructions.'
          });
        } else {
          return res.status(400).send({
            message: 'Failure sending email'
          });
        }

        done(err);
      });
    }
  ], function (err) {
    if (err) {
      return next(err);
    }
  });
};

/**
 * Reset password GET from email token
 */

exports.validateResetToken = function (req, res) {
  db.ResetPass.find({ where : {
    token: req.params.token,
    createdAt: {
      gte: Date.now() + 3600000 // 1 hour
    }
  } }).then(function (user) {
    if (!user) {
      return res.redirect('/password/reset/invalid');
    }
    res.redirect('/password/reset/' + req.params.token);
  });
};

/**
 * Reset password POST from email token
 */

exports.reset = function (req, res, next) {
  // Init Variables
  var passwordDetails = req.body;
  var message = null;

  async.waterfall([

    function (done) {
      //Find Reset Token
      db.ResetPass.find({ where : { token: req.params.token } }).then(function (reset) {
        if(reset){
          //Find User
          db.User.find({ where: { id: reset.userId } }).then(
              function(user){
                if (user) {
                  if (passwordDetails.newPassword === passwordDetails.verifyPassword) {
                    //Update Password
                    user.updateAttributes({
                      password: user.encryptPassword(passwordDetails.newPassword, user.salt)
                    }).then(function(a){
                      //Login User
                      req.login(user, function (err) {
                        if (err) {
                          res.status(400).send(err);
                        } else {
                          // Remove sensitive data before return authenticated user
                          user.password = undefined;
                          user.salt = undefined;
                          res.json(user);
                          //Remove Reset Token
                          reset.destroy().then(function(){
                            done(err, user);
                          }).catch(function(err){
                            res.status(400).send(err);
                          });
                        }
                      });
                    }).catch(function(err){
                      return res.status(400).send({
                        message: 'Sorry, It was unsuccessful'
                      });
                    });
                  } else {
                    return res.status(400).send({
                      message: 'Passwords do not match'
                    });
                  }
                } else {
                  return res.status(400).send({
                    message: 'Password reset token is invalid or has expired.'
                  });
                }
              }
          );
        }else{
          return res.status(400).send({
            message: 'Password reset token is invalid or has expired.'
          });
        }
      }).catch(function (err){
        return res.status(400).send({
          message: 'Password reset token is invalid or has expired.'
        });
      });
    },
    function (user, done) {
      res.render('modules/users/server/templates/reset-password-confirm-email', {
        name: user.fullname,
        appName: config.app.title
      }, function (err, emailHTML) {
        done(err, emailHTML, user);
      });
    },
    // If valid email, send reset email using service
    function (emailHTML, user, done) {
      var mailOptions = {
        to: user.email,
        from: config.mailer.from,
        subject: 'Your password has been changed',
        html: emailHTML
      };

      smtpTransport.sendMail(mailOptions, function (err) {
        done(err, 'done');
      });
    }
  ], function (err) {
    if (err) {
      return next(err);
    }
  });
};

/**
 * Change Password
 */
exports.changePassword = function (req, res, next) {
  // Init Variables
  var passwordDetails = req.body;
  var message = null;

  if (req.user) {
    if (passwordDetails.newPassword) {
      db.User.find({ where : { id: req.user.id } }).then(function (user) {
        if (user) {
          if (user.authenticate(passwordDetails.currentPassword)) {
            if (passwordDetails.newPassword === passwordDetails.verifyPassword) {
              user.updateAttributes({
                password : user.encryptPassword(passwordDetails.newPassword, user.salt)
              }).then(function (err) {
                if (err) {
                  return res.status(400).send({
                    message: err
                  });
                } else {
                  req.login(user, function (err) {
                    if (err) {
                      res.status(400).send(err);
                    } else {
                      res.send({
                        message: 'Password changed successfully'
                      });
                    }
                  });
                }
              });
            } else {
              res.status(400).send({
                message: 'Passwords do not match'
              });
            }
          } else {
            res.status(400).send({
              message: 'Current password is incorrect'
            });
          }
        } else {
          res.status(400).send({
            message: 'User is not found'
          });
        }
      });
    } else {
      res.status(400).send({
        message: 'Please provide a new password'
      });
    }
  } else {
    res.status(400).send({
      message: 'User is not signed in'
    });
  }
};
