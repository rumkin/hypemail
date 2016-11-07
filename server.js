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
const Spamc = require('spamc-stream');

function mailServer(config_ = {}, spamc, logger) {
    const config = Object.assign({
        port: 25,
    }, config_);

    const PORT = config.port || 25;
    const HOST = config.host || '0.0.0.0';
    const server = new SMTPServer(Object.assign(config, {
        onData(stream, session, callback) {
            logger.debug('data');
            let parser = new MailParser();
            let reporter = spamc.report();
            let email, report, hasError;

            let onEnd = () => {
                if (! email || ! report) {
                   return;
                }

                if (hasError) {
                    return;
                }

                email.spamReport = report;
                server.emit('mail', email);
                callback();
            };

            let onError= (error) => {
                logger.error(error);
                if (hasError) {
                    return;
                }

                hasError = true;
                callback(error);
            };

            stream.pipe(parser);
            stream.pipe(reporter);

            parser.on('end', (result) => {
                email = result;
                onEnd();
            });
            parser.on('error', onError);

            reporter.on('report', (result) => {
                report = result;
                onEnd();
            });
            reporter.on('error', onError);
        },
    }));

    server.listen(PORT, HOST, () => {
        logger.info('Mail server started at %s:%s', HOST, PORT);
    });

    return server;
};

function spamcClient() {
    return new Spamc();
}

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

function hypemail(config, ms, wss, mailer, logger) {
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

            let messageId = (Date.now()) + '.' + crypto.randomBytes(8).toString('hex')
                + '@' + config.host;

            mailer.sendMail({
                to: mail.from[0],
                from: mail.to[0],
                subject: mail.subject,
                inReplyTo: mail.messageId,
                messageId,
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

const {SSL_CERT, SSL_KEY, SMTP_PORT, SMTP_HOST} = process.env;
const HOST = process.env.HOST || process.argv[2] || process.env.HOSTNAME;
let sslKey, sslCert;

const logger = new Logger({
    level: 'debug',
});

if (SSL_CERT || SSL_KEY) {
    logger.info('Use SSL\nkey: %s\ncert %s', SSL_KEY, SSL_CERT);
    sslCert = fs.readFileSync(SSL_CERT);
    sslKey = fs.readFileSync(SSL_KEY);
}

const spamc = spamcClient();

const mail = mailServer({
    authOptional: true,
    cert: sslCert,
    key: sslKey,
    allowInsecureAuth: true,
    port: SMTP_PORT || 0,
    host: SMTP_HOST || HOST,
}, spamc, logger);


const wss = webSocketServer({
    port: '/var/run/hypemail.sock',
}, logger);

const mailer = nodeMailer();

hypemail({
    host: HOST,
}, mail, wss, mailer, logger);
