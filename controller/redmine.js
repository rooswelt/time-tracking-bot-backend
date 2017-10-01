var Q = require('q');
var Redmine = require('node-redmine');

var redmine;

exports.init = init;
exports.getProjects = getProjects;
exports.registerTime = registerTime;

function init(hostname, apiKey) {
    var config = {
        apiKey: apiKey,
        format: 'json'
    };
    redmine = new Redmine(hostname, config);
}

function getProjects() {
    var deferred = Q.defer();
    redmine.projects(null, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data.projects);
        }
    });
    return deferred.promise;
}

function registerTime(projectId, duration, description, date, activityId) {
    var deferred = Q.defer();
    var entry = {
        time_entry: {
            project_id: projectId,
            hours: duration,
            comments: description
        }
    };
    if (date) {
        entry.time_entry.spent_on = date;
    }
    if (activityId) {
        entry.time_entry.activity_id = activityId;
    }
    redmine.create_time_entry(entry, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}