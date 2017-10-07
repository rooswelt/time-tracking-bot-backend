var redmineCtrl = require('./controller/redmine');
const _ = require('lodash');
const moment = require('moment');

const REDMINE_HOST = process.env.REDMINE_HOST || 'http://localhost:3000';
const REDMINE_API_KEY = process.env.REDMINE_API_KEY || 'bb32e842e3608d594bc20fa256ff9985620e17a1';
redmineCtrl.init(REDMINE_HOST, REDMINE_API_KEY);


/*redmineCtrl.getProjects().then(function (projects) {
    console.log('Projects', projects);
    var project = projects[0];
    return redmineCtrl.registerTime(project.id, 5, 'Qualcosa');
}).then(function (result) {
    console.log('Result', result);
}, function (error) {
    console.error('Errore', error);
})*/
const today = moment();

const start = '2017-10-06';
const end = '2017-10-06';
redmineCtrl.getTimeEntries(null, start, end).then((entries) => {
    console.log('Number', entries.length);
    entries.forEach(function (entry) {
        console.log('Entry: ' + JSON.stringify(entry));
    }, this);
}).catch((error) => {
    console.error('Error', error);
})