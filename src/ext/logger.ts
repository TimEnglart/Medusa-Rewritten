'use strict';
import * as fs from 'fs';
import { RateLimiter } from './rate-limiter';
const writeLine = console.log;
export class Logger {
	public logFile: string;
	private rateLimiter: RateLimiter;
	constructor(logFileLocation = './logs', public filters: LogFilter[] | null = [LogFilter.Info], public json?: boolean) {
		this.rateLimiter = new RateLimiter({
			operations: 1,
			returnTokenOnCompletion: true,
			rate: 300
		});
		if (!fs.existsSync(logFileLocation)) {
			fs.mkdirSync(logFileLocation);
		}
		this.logFile = logFileLocation + '/' + Date.now() + (!this.json ? '.log' : '.json');
		fs.writeFileSync(this.logFile, this.json ? '{"logs":[]}' : ''); // Initialize File
		this.log('Logging Process Started', LogFilter.Debug);
		return this;
	}
	public async log(message: string, filter: LogFilter = LogFilter.Info): Promise<void> {
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
		// tslint:disable-next-line: no-floating-promises
		this.rateLimiter.addP(async () => {
			await this.startLog(formattedMessage);
		});
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

	private async startLog(formattedMessage: IFormattedLogMessage): Promise<void> {
		// Old Content
		const logFileContent: string[] = [];
		const readLogs = fs.createReadStream(this.logFile, { encoding: 'utf8' })
			.on('data', (chunk: string) => {
				logFileContent.push(chunk);
			}).on('error', (err: Error) => {
				writeLine(err);
				return;
			}).on('end', () => {
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
						if (err) writeLine('Writing Error' + err);
						return;
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