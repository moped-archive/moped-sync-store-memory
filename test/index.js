'use strict';

var test = require('../../moped-sync-store-tests');
var MemoryStore = require('../');

test(new MemoryStore()).done(function () {
  console.log('Tests passed');
});
