const Bot = require('bootbot');
const Q = require('q');
const _ = require('lodash');
const Agenda = require('agenda');
const timeTrackingCtrl = require('../controller/timeTracking');

var bot;

module.exports = {
    start: start
}

/**
 *
 * @param {*} pageToken
 * @param {*} verifyToken
 * @param {*} appSecret
 */
function start(pageToken, verifyToken, appSecret, port, agendaMongoUrl) {
    bot = new Bot({
        accessToken: pageToken,
        verifyToken: verifyToken,
        appSecret: appSecret
    });

    var agenda = new Agenda({ db: { address: agendaMongoUrl } });

    agenda.define('send message', function (job, done) {
        var userId = job.attrs.data.userId;
        var message = job.attrs.data.message || 'Ogni minuto ti scrivo!';
        bot.sendTextMessage(userId, message);
        done();
    });

    agenda.on('ready', function () {
        agenda.start();
    });

    bot.setGreetingText('Hey there! Welcome to Time Tracking Bot!');
    bot.setGetStartedButton((payload, chat) => {
        chat.getUserProfile().then((user) => {
            chat.say(`Hello, ${user.first_name}! Welcome to Time Tracking Bot. What can I do for you?`);
            createUser(chat).then(() => {
                mainMenu(chat);
            })
            /* var test = agenda.create('send message', { userId: user.id, message: 'TEST' });
             test.repeatEvery('1 minute').save();*/
        });
    });
    bot.setPersistentMenu([
        {
            type: 'postback',
            title: 'Registra Attività',
            payload: 'REGISTER_ACTIVITY'
        },
        {
            type: 'postback',
            title: 'Resoconto',
            payload: 'REPORT'
        },
        {
            type: 'postback',
            title: 'Ricomincia',
            payload: 'RESTART'
        }
    ]);

    bot.start(port);

    bot.on('message', _onMessageReceived);

    bot.on('postback:REGISTER_ACTIVITY', (payload, chat) => { registerActivity(payload, chat) });
    bot.on('postback:REPORT', (payload, chat) => { generateReport(payload, chat) });
    bot.on('postback:RESTART', (payload, chat) => { mainMenu(chat) });
}

function _onMessageReceived(payload, chat) {
    const text = payload.message.text;
    chat.sendTypingIndicator(1000).then(() => mainMenu(chat));
}

function mainMenu(chat) {
    const buttons = [
        { type: 'postback', title: 'Registra attività', payload: 'REGISTER_ACTIVITY' },
        { type: 'postback', title: 'Resoconto', payload: 'REPORT' }
    ];
    chat.sendButtonTemplate('Cosa vuoi fare?', buttons);
}

function createUser(chat) {
    var deferred = Q.defer();
    chat.getUserProfile().then((user) => {
        timeTrackingCtrl.createUser(user.id, user.first_name, user.last_name).then((createdUser) => {
            console.log('Redmine user created', createdUser);
            deferred.resolve(createdUser);
        }).catch((error) => {
            console.error('Error in user creation', error);
            deferred.reject(error);
        })
    });
    return deferred.promise;
}

function askProjectName(conv) {
    var deferred = Q.defer();
    conv.ask(`Nome del progetto?`, (payload, conv) => {
        const projectName = payload.message.text;
        conv.set('projectName', projectName);
        timeTrackingCtrl.createProject(conv.userId, projectName).then((project) => {
            conv.set('projectName', project.name);
            conv.set('projectId', project.id);
            deferred.resolve(project);
        }).catch((error) => {
            console.error('Error in project creation', error);
            deferred.reject(error);
        });
    })
    return deferred.promise;
}

function generateReport(payload, chat) {
    chat.say('Mi dispiace, ancora non sono capace...per poco però!');
    mainMenu(chat);
}

function registerActivity(payload, chat) {
    const askProject = (conv) => {
        timeTrackingCtrl.getProjects(conv.userId).then((projects) => {
            if (!projects || projects.length == 0) {
                askProjectName(conv).then((project) => askDuration(conv));
            } else {
                var quickReplies = [];
                _.each(projects, function (project) {
                    quickReplies.push(`${project.id} - ${project.name}`);
                });
                quickReplies.push('Nuovo progetto');
                const question = {
                    text: `Quale progetto?`,
                    quickReplies: quickReplies
                };

                const answer = (payload, conv) => {
                    const project = payload.message.text;
                    if (project === 'Nuovo progetto') {
                        askProjectName(conv).then((project) => askDuration(conv));
                    } else {
                        const projectId = project.substring(0, project.indexOf('-') - 1);
                        const projectName = project.substring(project.indexOf('-') + 1);
                        conv.set('projectName', projectName);
                        conv.set('projectId', projectId);
                        conv.say(`Ok, progetto ${project}.`).then(() => askDuration(conv));
                    }
                };
                conv.ask(question, answer);
            }
        });
    };

    const askDuration = (conv) => {
        const question = {
            text: 'Quante ore?',
            quickReplies: ['0.5', '1', '2', '4', '8']
        }

        const answer = (payload, conv) => {
            const duration = payload.message.text;
            conv.set('duration', duration);
            askNote(conv);
        };

        conv.ask(question, answer);
    }

    const askNote = (conv) => {
        conv.ask(`Descrivi brevemente cosa hai fatto`, (payload, conv) => {
            const note = payload.message.text;
            conv.set('note', note);
            sendSummary(conv);
        })
    }

    const sendSummary = (conv) => {
        conv.say(`Quindi, ricapitolando:\n - Progetto: ${conv.get('projectName')}\n - Durata: ${conv.get('duration')}\n - Attività: ${conv.get('note')}`);
        const question = {
            text: `Giusto?`,
            quickReplies: ['Yes', 'No']
        };

        const answer = (payload, conv) => {
            const text = payload.message.text;
            conv.say(`You said ${text}!`);
        };

        const callbacks = [
            {
                pattern: ['yes', 'y', 'Yes', 'Y'],
                callback: (payload, conv) => { registerActivity(conv) }
            },
            {
                pattern: ['no', 'No', 'n', 'N'],
                callback: (payload, conv) => { askProject(conv) }
            }
        ];

        const options = {
            typing: true
        };

        conv.ask(question, answer, callbacks, options);
    };

    const registerActivity = (conv) => {
        var projectId = conv.get('projectId');
        var duration = conv.get('duration');
        var hours = parseFloat(duration);
        var note = conv.get('note');
        timeTrackingCtrl.registerTime(conv.userId, hours, projectId, note).then(function () {
            conv.say('Attività registrata correttamente');
            conv.end();
            mainMenu(chat);
        }, function (error) {
            conv.say('Errore nella registrazione: ' + JSON.stringify(error));
            conv.say('Per favore riprova, se il problema persiste contatta lo sviluppatore: rooswelt83@gmail.com');
            conv.end();
            mainMenu(chat);
        });
    };

    chat.conversation((conv) => {
        askProject(conv);
    });
}

function newProject(payload, chat) {
    chat.conversation((conv) => {
        askProjectName(conv).then((project) => {
            conv.say('Progetto ' + project.name + ' registrato');
            mainMenu(chat)
        });
    });
}

