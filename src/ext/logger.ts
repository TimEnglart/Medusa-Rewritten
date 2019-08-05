'use strict';
import * as fs from 'fs';
const writeLine = console.log;
export class Logger {
	public logFile: string;
	constructor(logFileLocation = './logs', public filters: LogFilter[] | null = [LogFilter.Info]) {
		if (!fs.existsSync(logFileLocation)) {
			fs.mkdirSync(logFileLocation);
		}
		this.logFile = logFileLocation + '/' + Date.now() + '.log';
		this.log('Logging Process Started', LogFilter.Debug);
		return this;
	}
	public log(message: string, filter: LogFilter = LogFilter.Info) {
		if (this.filters && !this.filters.includes(filter)) {
			return;
		}
		// Always Log Just Check if you Want to Print
		if (filter === LogFilter.Info) {
			writeLine(/*`[${LogFilter[filter]}] ${message}`*/ message);
		}
		const formattedMessage = this.formatMessage({
			message,
			time: new Date(),
			type: filter,
		} as LogMessage);
		if (formattedMessage) {
			fs.appendFileSync(this.logFile, formattedMessage.join('\n'));
		}
	}

	private formatMessage(message: LogMessage) {
		let formattedMessage: string[] | null = null;
		if (message.message) {
			formattedMessage = [
				`[${LogFilter[message.type]}] - ${message.time.toISOString()}`,
				message.message,
				'-------------------------------------------------------\n',
			];
		}
		return formattedMessage;
	}
}
export enum LogFilter {
	Info,
	Debug,
	Error,
}
interface LogMessage {
	type: LogFilter;
	message: string;
	time: Date;
}
