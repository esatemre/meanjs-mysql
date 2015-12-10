'use strict';

// Authentication service for user variables
angular.module('users').factory('Authentication', ['$window',
  function ($window) {
    $window.user.roles = ['admin'];
    var auth = {
      user: $window.user
    };

    return auth;
  }
]);
