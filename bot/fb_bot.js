const Bot = require('bootbot');
const _ = require('lodash');
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
function start(pageToken, verifyToken, appSecret, port) {
    bot = new Bot({
        accessToken: pageToken,
        verifyToken: verifyToken,
        appSecret: appSecret
    })

    bot.setGreetingText('Hey there! Welcome to Time Tracking Bot!');
    bot.setGetStartedButton((payload, chat) => {
        chat.getUserProfile().then((user) => {
            chat.say(`Hello, ${user.first_name}! Welcome to Time Tracking Bot. What can I do for you?`);
            mainMenu(chat);
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
            title: 'Nuovo Progetto',
            payload: 'NEW_PROJECT'
        }
    ]);

    bot.start(port);

    bot.on('message', _onMessageReceived);


    bot.on('postback:REGISTER_ACTIVITY', (payload, chat) => { registerActivity(payload, chat) });
    bot.on('postback:NEW_PROJECT', (payload, chat) => { newProject(payload, chat) });
}

function _onMessageReceived(payload, chat) {
    const text = payload.message.text;
    chat.sendTypingIndicator(1000).then(() => mainMenu(chat));
}

function mainMenu(chat) {
    const buttons = [
        { type: 'postback', title: 'Registra attività', payload: 'REGISTER_ACTIVITY' },
        { type: 'postback', title: 'Nuovo progetto', payload: 'NEW_PROJECT' }
    ];
    chat.sendButtonTemplate('Cosa vuoi fare?', buttons);
}

function registerActivity(payload, chat) {
    const askProject = (conv) => {
        timeTrackingCtrl.getProjects().then((projects) => {
            var quickReplies = [];
            _.each(projects, function (project) {
                quickReplies.push(`${project.id} - ${project.name}`);
            });
            const question = {
                text: `Quale progetto?`,
                quickReplies: quickReplies
            };

            const answer = (payload, conv) => {
                const project = payload.message.text;
                conv.set('project', project);
                const projectId = project.substring(0, project.indexOf('-') - 1);
                conv.set('projectId', projectId);
                conv.say(`Ok, progetto ${project}.`).then(() => askDuration(conv));
            };
            conv.ask(question, answer);
        });
    };

    /*const askIssue = (conv) => {
        const projectId = conv.get('projectId');
        timeTrackingCtrl.getProjectIssues(projectId, 'sort by: updated', 0, 4).then((issues) => {
            var elements = [];
            var quickReplies = [];
            _.each(issues, function (issue) {
                quickReplies.push(issue.id);
                elements.push({
                    title: issue.id,
                    subtitle: issue.summary
                })
            });
            const buttons = [
                { type: 'postback', title: 'Altre...', payload: 'SEARCH_ISSUE' }
            ];

            const question = {
                text: `Quale attività?`,
                quickReplies: quickReplies
            };

            const answer = (payload, conv) => {
                const issueId = payload.message.text;
                conv.set('issueId', issueId);
                askDuration(conv);
            };
            conv.sendListTemplate(elements, [], { topElementStyle: 'compact' }).then(() => { conv.ask(question, answer) });

        })
    }*/

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
        const question = {
            text: `Una nota?`,
            quickReplies: ['Yes', 'No']
        };

        const answer = (payload, conv) => {
            const text = payload.message.text;
            conv.say(`You said ${text}!`);
        };

        const callbacks = [
            {
                pattern: ['yes', 'y', 'Yes', 'Y'],
                callback: (payload, conv) => {
                    conv.ask(`Scrivi la nota`, (payload, conv) => {
                        const note = payload.message.text;
                        conv.set('note', note);
                        sendSummary(conv);
                    })
                }
            },
            {
                pattern: ['no'],
                callback: (payload, conv) => {
                    conv.set('note', '');
                    sendSummary(conv)
                }
            }
        ];
        conv.ask(question, answer, callbacks);
    }

    const sendSummary = (conv) => {
        conv.say(`Quindi, ricapitolando:\n - Progetto: ${conv.get('project')}\n - Durata: ${conv.get('duration')}\n - Nota: ${conv.get('note')}`);
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
        timeTrackingCtrl.registerTime(hours, projectId, note).then(function () {
            conv.end();
            mainMenu(chat);
        }, function (error) {
            conv.end();
            mainMenu(chat);
        });
    };

    chat.conversation((conv) => {
        askProject(conv);
    });
}

function newProject(payload, chat) {
    chat.say(`Mi dispiace, ancora non lo so fare`, { typing: true }).then(() => mainMenu(chat));
}

