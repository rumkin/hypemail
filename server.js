'use strict';

const url = require('url');
const http = require('http');
const fs = require('fs');
const {SMTPServer} = require('smtp-server');
const {MailParser} = require('mailparser');
const NodeMailer = require('nodemailer');
const WebSocketServer = require('ws').Server;
const Logger = require('./lib/logger.js');
const crypto = require('crypto');

function mailServer(config_ = {}, logger) {
    const config = Object.assign({
        port: 25,
    }, config_);

    const PORT = config.port;
    const server = new SMTPServer(Object.assign(config, {
        onData(stream, session, callback) {
            let parser = new MailParser();

            stream.pipe(parser);
            parser.on('end', (mail) => {
                server.emit('mail', mail);
                callback();
            });
            parser.on('error', callback);
        },
    }));

    server.listen(PORT, () => {
        logger.info('Mail server started at localhost:%s', PORT);
    });

    return server;
};

function webSocketServer(config_ = {}, logger) {
    const config = Object.assign({
        port: 12321,
    }, config_);

    const PORT = config.port;
    let isFile = ! PORT.match(/^\d+$/);

    if (isFile && fs.existsSync(PORT)) {
        fs.unlinkSync(PORT);
    }

    const server = http.createServer((req, res) => {
        res.end('OK');
    });

    let wss = new WebSocketServer({server});

    server.listen(PORT, () => {
        logger.info('Web socket server is listening %s port', PORT);
        if (isFile && fs.existsSync(PORT)) {
            fs.chmod(PORT, 0x775);
        }
    });

    return wss;
}

function hypemail(ms, wss, mailer, logger) {
    let sockets = new Map();

    ms.on('mail', (mail) => {
        logger.debug('Mail to %s', mail.to[0].address);

        for (let recepient of mail.to) {
            let [mailbox] = recepient.address.split('@');

            if (! sockets.has(mailbox)) {
                logger.warn('Mailbox "%s" not found', mailbox);
                continue;
            }

            logger.debug('Message for "%s"', mailbox);
            let {sock} = sockets.get(mailbox);

            sock.send(JSON.stringify({type: 'email', value: mail}, null, 4));

            mailer.sendMail({
                to: mail.from[0],
                from: mail.to[0],
                subject: mail.subject,
                inReplyTo: mail.messageId,
                messageId: (Date.now()) + '.' + crypto.randomBytes(8).toString('hex') + '@hm.rumk.in',
                text: 'Hypemail received your email. Thanks!',
            }, (err, info) => {
                if (err) {
                    logger.error(err);
                }
                else {
                    logger.debug(info);
                }
            });
            return;
        }
    });

    wss.on('connection', (sock) => {
        logger.debug('New connection %s', sock.upgradeReq.url);
        let {pathname, query:{key, id}} = url.parse(sock.upgradeReq.url, true);
        pathname = '/' + pathname.replace(/^\/+|\/+^/g, '');

        if (pathname !== '/email') {
            sock.close();
            return;
        }

        if (sockets.has(id) && socket.get(id).key !== key) {
            sock.close();
            return;
        }

        logger.info('Client "%s" connected', id);

        sockets.set(id, {key, sock});

        sock.on('close', () => {
            logger.debug('Client "%s" disconnected', id);
            sockets.delete(id);
        });
    });
}

function nodeMailer(config) {
    return NodeMailer.createTransport(config);
}

exports.mailServer = mailServer;
exports.webSocketServer = webSocketServer;
exports.hypemail = hypemail;

if (module.parent) {
    return;
}

const logger = new Logger({
    level: 'debug',
});

const mail = mailServer({
    authOptional: true,
}, logger);


const wss = webSocketServer({
    port: '/var/run/hypemail.sock',
}, logger);

const mailer = nodeMailer();

hypemail(mail, wss, mailer, logger);
