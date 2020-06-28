'use strict';
import * as fs from 'fs';
import * as path from 'path';
import RateLimiter from '@timenglart/limited-rate-limiter';
import * as Colors from './Colors';
const writeLine = console.log;

export enum LogFilter {
	Info,
	Debug,
	Error,
	Success
}
interface ILogMessage {
	type: LogFilter;
	message: string;
	time: Date;
}
interface ILogFile {
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

export class Logger {
	public static async log(message: string, filter: LogFilter = LogFilter.Info) {
		// Always Log Just Check if you Want to Print
		if (filter === LogFilter.Info) {
			writeLine(/*`[${LogFilter[filter]}] ${message}`*/ message);
		}
		const formattedMessage = Logger.formatMessage({
			message,
			time: new Date(),
			type: filter,
		});

		if (!formattedMessage) {
			return;
		}
		// this.rateLimiter.add(async () => {
		// 	await this.startLog(formattedMessage);
		// });
	}
	private static formatMessage(message: ILogMessage): IFormattedLogMessage | undefined {
		if (message.message) {
			return {
				type: LogFilter[message.type],
				time: message.time.toISOString(),
				message: message.message,
			};
		}
		return;
	}
	public logFile: string;
	private rateLimiter: RateLimiter;
	constructor(
		private logFileLocation = './logs',
		public filters: LogFilter[] | undefined = [LogFilter.Info, LogFilter.Debug, LogFilter.Error, LogFilter.Success],
		public json?: boolean,
	) {
		this.rateLimiter = new RateLimiter({
			operations: 1,
			returnTokenOnCompletion: true,
			rate: 400,
		});
		if (!fs.existsSync(logFileLocation)) {
			fs.mkdirSync(logFileLocation);
		}
		this.logFile = logFileLocation + '/' + Date.now() + (!this.json ? '.log' : '.json');
		fs.writeFileSync(this.logFile, this.json ? '{}' : ''); // Initialize File
		this.logS('Logging Process Started', LogFilter.Debug);
		return this;
	}
	private resolveColor(type: LogFilter): string {
		switch(type) {
			case LogFilter.Error: return Colors.default.FgRed;
			case LogFilter.Debug: return Colors.default.FgYellow;
			case LogFilter.Info: return Colors.default.Reset;
			case LogFilter.Success: return Colors.default.FgGreen;
			default: return Colors.default.Reset;
		}
	}
	private colorMessage(message: IFormattedLogMessage): string {
		let startColor;
		switch(message.type.toUpperCase()) {
			case 'ERROR': startColor = Colors.default.FgRed; break;
			case 'DEBUG': startColor = Colors.default.FgYellow; break;
			case 'INFO': startColor = Colors.default.Reset; break;
			case 'SUCCESS': startColor = Colors.default.FgGreen; break;
			default: startColor = Colors.default.Reset; break;
		}
		return `${startColor}[${message.type}] ${message.message}${Colors.default.Reset}`;
	}
	public async log(message: string, filter: LogFilter = LogFilter.Info): Promise<void> {
		// New Message

		const formattedMessage = Logger.formatMessage({
			message,
			time: new Date(),
			type: filter,
		});

		if (!formattedMessage) {
			return;
		}
		
		if (this.filters && this.filters.includes(filter)) {
			writeLine('---------------------------');
			writeLine(this.colorMessage(formattedMessage));
			writeLine('---------------------------');
		}
		this.rateLimiter.add(async () => {
			await this.v2Log(formattedMessage);
			//await this.startLog(formattedMessage);
		});
	}
	public logS(message: string, filter: LogFilter = LogFilter.Info): void {
		// tslint:disable-next-line: no-floating-promises
		this.log(message, filter);
	}
	public logDirectory() {
		return path.relative(process.cwd(), this.logFileLocation);
	}
	public returnLogFile() {
		return new Promise((resolve: (logFile: string) => void, reject: (err: Error) => void) => {
			const logFileContent: string[] = [];
			const readLogs = fs
				.createReadStream(this.logFile, { encoding: 'utf8' })
				.on('data', (chunk: string) => {
					logFileContent.push(chunk);
				})
				.on('error', (err: Error) => {
					return reject(err);
				})
				.on('end', () => {
					return resolve(logFileContent.join(''));
				});
		});
	}
	private logCache: Array<IFormattedLogMessage> = [];
	private timeout: NodeJS.Timeout | undefined;
	private async v2Log(formattedMessage: IFormattedLogMessage): Promise<void> {
		this.logCache.push(formattedMessage);
		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = setTimeout(async () => {
			fs.createWriteStream(this.logFile, { encoding: 'utf8' }).write(JSON.stringify(this.logCache), (err) => {
				if (err) {
					this.logS(`[LOG ERROR] Write Stream ERROR: ${err}`, 2);
				}
				return;
			});
		}, 5000);
	}

	private async startLog(formattedMessage: IFormattedLogMessage): Promise<void> {
		// Old Content
		const logFileContent: string[] = [];
		const readLogs = fs
			.createReadStream(this.logFile, { encoding: 'utf8' })
			.on('data', (chunk: string) => {
				logFileContent.push(chunk);
			})
			.on('error', (err: Error) => {
				writeLine(err);
				return;
			})
			.on('end', () => {
				let newLogFileContent = logFileContent.join('');
				if (this.json) {
					const obj: ILogFile = JSON.parse(newLogFileContent);
					obj.logs.push(formattedMessage);
					newLogFileContent = JSON.stringify(obj);
				} else {
					newLogFileContent += [
						`[${formattedMessage.type}] - ${formattedMessage.time}`,
						`${formattedMessage.message}`,
						`-------------------------------------------------------\n`,
					].join('\n');
				}
				fs.createWriteStream(this.logFile, { encoding: 'utf8' }).write(newLogFileContent, err => {
					if (err) writeLine('Writing Error' + err);
					return;
				});
			});
	}
}

