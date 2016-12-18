'use strict';

const {format} = require('util');
const colors = require('colors');

const LEVELS = [
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
    'none',
];

class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.marker = options.marker || '=>';
    }

    enabled(level) {
        return LEVELS.indexOf(level) >= LEVELS.indexOf(this.level);
    }

    getPrefix() {
        return '[' + (new Date()).toISOString() + ']';
    }

    debug(...args) {
        if (! this.enabled('debug')) {
            return;
        }

        let marker = colors.bold.cyan(this.marker);
        console.error(this.getPrefix(), marker, format(...args));
    }

    info(...args) {
        if (! this.enabled('info')) {
            return;
        }

        let marker = colors.bold.blue(this.marker);
        console.log(this.getPrefix(), marker, format(...args));
    }

    warn(...args) {
        if (! this.enabled('warn')) {
            return;
        }

        let marker = colors.bold.yellow(this.marker);
        console.error(this.getPrefix(), marker, format(...args));
    }

    error(...args) {
        if (! this.enabled('error')) {
            return;
        }

        let marker = colors.bold.red(this.marker);
        console.error(this.getPrefix(), marker, format(...args));
    }

    fatal(...args) {
        if (! this.enabled('fatal')) {
            return;
        }

        let marker = colors.bgRed.white(this.marker);
        console.error(this.getPrefix(), marker, format(...args));
    }
}
module.exports = Logger;
