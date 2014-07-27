'use strict';

var Promise = require('promise');
var BaseStore = require('moped-sync-store-base');
var clone = require('clone');
var ObjectId = require('moped-id');
var applyUpdate = require('moped-apply-update');

module.exports = MemoryStore;
function MemoryStore() {
  this.state = {};
  this.changes = [];
  this.waiting = [];
  BaseStore.call(this);
}
MemoryStore.prototype = Object.create(BaseStore.prototype);
MemoryStore.prototype.constructor = MemoryStore;

MemoryStore.prototype._getInitial = function (filter) {
  return {
    next: this.changes.length,
    state: this.state
  };
};

MemoryStore.prototype._getItem = function (collection, id) {
  var collection = this.state[collection] || [];
  for (var i = 0; i < collection.length; i++) {
    if (ObjectId.equal(collection[i]._id, id)) {
      return collection[i];
    }
  }
  return null;
};

MemoryStore.prototype._writeChanges = function (changes) {
  changes = changes.filter(function (change) {
    return !this.changes.some(function (c) { return ObjectId.equal(c.guid, change.guid); });
  }.bind(this));
  for (var i = 0; i < changes.length; i++) {
    this.changes.push(changes[i]);
    var collection = this.state[changes[i].collection] = this.state[changes[i].collection] || [];
    applyUpdate(collection, changes[i]);
  }

  this.waiting.forEach(function (waiting) {
    waiting();
  });
};

MemoryStore.prototype._getChanges = function (id) {
  if (this.changes.length > id) {
    var next = this.changes.length;
    var changes = this.changes.slice(id);
    return {
      changes: changes,
      next: next
    };
  }
  var waiting = this.waiting;
  return new Promise(function (resolve) {
    var timeout;
    function onComplete() {
      clearTimeout(timeout);
      resolve('next');
    }
    this.waiting.push(onComplete);
    timeout = setTimeout(function () {
      if (waiting.indexOf(onComplete) !== -1) {
        waiting.splice(waiting.indexOf(onComplete), 1);
      }
      resolve('timeout');
    }, 30000);
  }.bind(this)).then(function (result) {
    if (result === 'timeout') return {changes: [], next: id};
    else return this._getChanges(id);
  }.bind(this));
};
