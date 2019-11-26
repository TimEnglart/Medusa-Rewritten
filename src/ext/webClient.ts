import * as https from 'https';
import * as xml from 'xml2js';
import { IncomingMessage } from 'http';
import { Url } from 'url';
import { CommandError } from '.';

class Cookie {
	public cookieName?: string;
	public cookieValue?: string;
	public Expires?: Date;
	public MaxAge?: number;
	public Domain?: string;
	public Path?: string;
	public Secure?: boolean;
	public HttpOnly?: boolean;
	public SameSite?: 'Strict' | 'Lax' | 'None' | string;
	public prefix?: '_Secure' | '_Host' | string;
	public received: Date;
	constructor(public cookieString: string) {
		this.received = new Date();
		cookieString = decodeURIComponent(cookieString);
		this.assign();
		return this;
	}

	private parseCookie() {
		const pattern = /([.\|]*[^; =]+)(?:=(.[^;]*))?/g;
		let match;
		const matches = [];
		do {
			match = pattern.exec(this.cookieString);
			if (match) matches.push(match);
		} while (match);
		return matches;
	}
	private assign() {
		const matches = this.parseCookie();
		for (let i = 1; i < matches.length; i++) { // 0 - Full Match, 1 - Name/Key, 2 - Value
			if (matches[i][2]) { // key and Value
				if (i === 1) {
					const removePrefix = /__(Secure|Host)-(.*)$/.exec(matches[i][1]);
					if (removePrefix) {
						this.prefix = removePrefix[1];
						this.cookieName = removePrefix[2];
					}
					else {
						this.cookieName = matches[i][1];
					}
					this.cookieValue = matches[i][2];
				} else {
					Object.assign(this, {
						[matches[i][1]]: matches[i][2]
					});
				}
			}
			else {
				Object.assign(this, {
					[matches[i][1]]: true
				});
			}
		}
	}
}

interface ExtendedRequestOptions extends https.RequestOptions {
	responseType?: 'RAW' | 'JSON' | 'XML' | undefined;
	doNotFollowRedirect?: boolean;
}
// tslint:disable-next-line: max-classes-per-file
class RequestError extends Error {
	public hostname?: string | null;
	public statusCode: number;
	public path?: string | null;
	public redirectUrl?: URL;
	constructor(public options: ExtendedRequestOptions, public response: IncomingMessage) {
		super(`HTTP_STATUS_CODE_${response.statusCode}`);
		this.statusCode = response.statusCode || 0;
		this.hostname = options.hostname;
		this.path = options.path;
		this.redirectUrl = response.headers.location ? new URL(response.headers.location) : undefined;
	}
	public generateCommandError(): CommandError {
		return new CommandError(`HTTP_STATUS_CODE_${this.statusCode}`);
	}
}
// tslint:disable-next-line: max-classes-per-file
class MyRequester {
	public cookies: Map<string, Cookie[]>;
	constructor(public options: ExtendedRequestOptions) {
		this.cookies = new Map<string, Cookie[]>();
		// options.protocol = 'https:';
	}
	public request(options?: ExtendedRequestOptions, postData = null): Promise<any | Error> {
		if (!this.options && !options) throw new Error('No Options');
		return new Promise(async (resolve, reject) => {
			const overrideOptions = this.options;
			Object.assign(overrideOptions, options);
			overrideOptions.headers!.cookie = this.prepareCookies(overrideOptions.hostname);
			const req = https.request(overrideOptions, (res) => {
				if (res.headers['set-cookie']) this.addCookies(overrideOptions.hostname, res.headers['set-cookie']);
				const responseData: string[] = [];
				if (res.statusCode !== 200) { // Not Successful
					switch (res.statusCode!.toString()[0]) { // handle accordingly
						case '3':
								if (!res.headers.location || overrideOptions.doNotFollowRedirect) return reject(new RequestError(overrideOptions, res));
								const redirectUrl = new URL(res.headers.location);
							try {
								return resolve(this.request({ hostname: redirectUrl.hostname, path: redirectUrl.pathname /*, protocol: redirectUrl.protocol , port: redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80)*/ }));
							}
							catch (e) {
								return reject(new RequestError(overrideOptions, res));
							}
						default:
							return reject(new RequestError(overrideOptions, res));
					}
				}
				else {
					res.on('data', (chunk) => {
						responseData.push(chunk.toString());
					}).on('end', () => {
						// figure out what to change Data to
						const resolvedData: string = responseData.join('');
						if (overrideOptions.responseType === 'JSON') {
							return resolve(JSON.parse(resolvedData));
						} else if (overrideOptions.responseType === 'XML') {
							xml.parseString(resolvedData, (err, results) => {
								if (err) reject(err);
								return resolve(JSON.parse(results));
							});
						}
						else {
							return resolve(resolvedData);
						}
					});
				}
			}).on('error', (err) => {
				return reject(err);
			});
			if (overrideOptions.method === 'POST' && postData) req.write(postData);
			req.end();
		});
	}
	private prepareCookies(hostName?: string | null | undefined) {
		if (!hostName) return;
		const hostsCookies = this.cookies.get(hostName);
		if (!hostsCookies) return '';
		const cookies = [];
		for (let i = 0; i < hostsCookies.length; i++) {
			if (hostsCookies[i].Expires && new Date() > hostsCookies[i].Expires!) {
				hostsCookies.splice(i, 1);
				i--;
				continue;
			}
			if (hostsCookies[i].MaxAge) {
				hostsCookies[i].received.setSeconds(hostsCookies[i].received.getSeconds() + hostsCookies[i].MaxAge!);
				if (hostsCookies[i].received < new Date()) {
					hostsCookies.splice(i, 1);
					i--;
					continue;
				}
			}
			cookies.push(encodeURIComponent(`${hostsCookies[i].cookieName}=${hostsCookies[i].cookieValue}`));
		}
		return `Cookie: ${cookies.join('; ')}`;
	}
	private addCookies(hostname: string | null | undefined, cookies: string[]) {
		if (!hostname) return;
		let currentHostCookies = this.cookies.get(hostname);
		if (!currentHostCookies) currentHostCookies = [] as Cookie[];
		for (const cookie of cookies) {
			currentHostCookies.push(new Cookie(cookie));
			this.cookies.set(hostname, currentHostCookies);
		}
	}

}

async function test() {
	const req = new MyRequester({
		hostname: 'www.bungie.net',
		port: 443,
		path: '/Platform/GroupV2/2135581/',
		method: 'GET',
		headers: {
			'X-API-Key': '9a171d9e3be74e60884fa77b2c0f4965'
		}
	});
	console.log(await req.request());
}

export { MyRequester, RequestError };