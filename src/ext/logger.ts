'use strict';
import * as fs from 'fs';
const writeLine = console.log;
export class Logger {
	public logFile: string;
	private queue: string[] = [];
	constructor(logFileLocation = './logs', public filters: LogFilter[] | null = [LogFilter.Info], public json?: boolean) {
		if (!fs.existsSync(logFileLocation)) {
			fs.mkdirSync(logFileLocation);
		}
		this.logFile = logFileLocation + '/' + Date.now() + (!this.json ? '.log' : '.json');
		fs.writeFileSync(this.logFile, this.json ? '{"logs":[]}' : ''); // Initialize File
		this.log('Logging Process Started', LogFilter.Debug);
		return this;
	}
	public log(message: string, filter: LogFilter = LogFilter.Info): void {
		const seed = Math.random().toString().slice(2, 11);
		this.queue.push(seed);
		// New Message
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

		if (!formattedMessage) {
			return;
		}

		this.startLog(formattedMessage, seed);

	}

	public returnLogFile() {
		return new Promise((resolve: (logFile: string) => void, reject: (err: Error) => void) => {
			const logFileContent: string[] = [];
			const readLogs = fs.createReadStream(this.logFile, { encoding: 'utf8' })
				.on('data', (chunk: string) => {
					logFileContent.push(chunk);
				}).on('error', (err: Error) => {
					return reject(err);
				}).on('end', () => {
					return resolve(logFileContent.join(''));
				});
		});
	}

	// TODO: Allow queue to have X operations every Y Seconds
	private startLog(formattedMessage: IFormattedLogMessage, seed: string): void {
		if (this.queue[0] !== seed) {
			setTimeout(() => this.startLog(formattedMessage, seed), 400);
			return;
		}
		// Old Content
		const logFileContent: string[] = [];
		const readLogs = fs.createReadStream(this.logFile, { encoding: 'utf8' })
			.on('data', (chunk: string) => {
				logFileContent.push(chunk);
			}).on('error', (err: Error) => {
				writeLine(err);
				return;
			}).on('end', () => {
				// 
				let newLogFileContent = logFileContent.join('');
				if (this.json) {
					const obj = JSON.parse(newLogFileContent) as LogFile;
					obj.logs.push(formattedMessage);
					newLogFileContent = JSON.stringify(obj);
				}
				else {
					newLogFileContent += [`[${formattedMessage.type}] - ${formattedMessage.time}`, `${formattedMessage.message}`, `-------------------------------------------------------\n`].join('\n');
				}
				fs.createWriteStream(this.logFile, { encoding: 'utf8' })
					.write(newLogFileContent, (err) => {
						if (err) writeLine(err);
						this.queue.shift();
					});
			});
	}
	private formatMessage(message: LogMessage): IFormattedLogMessage | undefined {
		if (message.message) {
			return {
				type: LogFilter[message.type],
				time: message.time.toISOString(),
				message: message.message
			};
		}
		return;
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
interface LogFile {
	logs: IFormattedLogMessage[];
}
interface IFormattedLogMessage {
	type: string;
	message: string;
	time: string;
}
interface ILogOptions {
	jsonOutput?: boolean;
	timeOut?: number;
}