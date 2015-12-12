'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  db = require(path.resolve('./config/lib/sequelize'));

/**
 * Create a article
 */
exports.create = function (req, res) {
  req.body.UserId = req.user.id;

  db.Article.create(req.body).then(function(article){
    if(!article){
      return res.send('users/signup', { errors: 'Article could not be created' });
    } else {
      return res.jsonp(article);
    }
  }).catch(function(err){
    return res.send('users/signup', {
      errors: err,
      status: 500
    });
  });
};

/**
 * Show the current article
 */
exports.read = function (req, res) {
  res.json(req.article);
};

/**
 * Update a article
 */
exports.update = function (req, res) {
  var article = req.article;

  article.updateAttributes({
    title: req.body.title,
    content: req.body.content
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
 * Delete an article
 */
exports.delete = function (req, res) {
  var article = req.article;

  article.destroy().then(function(){
    return res.jsonp(article);
  }).catch(function(err){
    return res.render('error', {
      error: err,
      status: 500
    });
  });
};

/**
 * List of Articles
 */
exports.list = function (req, res) {
  db.Article.findAll({ include: [db.User] }).then(function(articles){
    return res.jsonp(articles);
  }).catch(function(err){
    return res.render('error', {
      error: err,
      status: 500
    });
  });
};

/**
 * Article middleware
 */
exports.articleByID = function (req, res, next, id) {
  db.Article.find({ where: { id: id }, include: [db.User] }).then(function(article){
    if(!article) {
      return next(new Error('Failed to load article ' + id));
    } else {
      req.article = article;
      return next();
    }
  }).catch(function(err){
    return next(err);
  });
};
