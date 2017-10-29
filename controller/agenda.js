const Q = require('q');
const Redmine = require('node-redmine');
const Agenda = require('agenda');

var agenda;

module.exports = {
    init: init,
    addJobType: addJobType,
    scheduleJob: scheduleJob,
    cancelUserJob: cancelUserJob,
    getUserJobs: getUserJobs
}

function init(agendaMongoUrl) {
    agenda = new Agenda({ db: { address: agendaMongoUrl } });
    agenda.on('ready', function () {
        agenda.start();
    });
}

function addJobType(name, callback) {
    agenda.define(name, function (job, done) {
        console.log('Executing ' + name);
        callback(jobs.attrs.data).then(() => { done(); });
    })
}

function scheduleJob(callback, interval, userId, params) {
    if (!params) {
        params = {}
    }
    params.userId = userId;
    var name = userId + '_job';
    agenda.define(name, function (job, done) {
        console.log('Executing ' + name);
        callback(job.attrs.data)
        done();
    })
    agenda.every(interval, name, params);
}

function cancelUserJob(name, userId) {
    var deferred = Q.defer();
    agenda.cancel({ name: name, "data.userId": userId }, function (err, numRemoved) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(numRemoved);
        }
    });
    return deferred.promise;
}

function getUserJobs(userId) {
    var deferred = Q.defer();
    agenda.jobs({ "data.userId": userId }, function (err, jobs) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(jobs);
        }
    });
    return deferred.promise;
}