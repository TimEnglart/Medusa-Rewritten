import { MyRequester, ExtendedRequestOptions, RequestError } from "./webClient";
import { BungieResponse } from "./discordToBungie";
import RateLimiter from "limited-rate-limiter";

class BungieAPIError<T> extends Error {
	constructor(bungieResponse: EndPointError<BungieResponse<T>>) {
		super(bungieResponse.ErrorType);
	}
}
interface EndPointError<T> {
	ErrorType: string;
	Response: T;
}

export default class BungieAPIRequester {
	public numberOfRetries = 0;
	private requester: MyRequester;

	private RateLimiter: RateLimiter;

	constructor(requestOptions?: ExtendedRequestOptions) {
		const defaultOptions: ExtendedRequestOptions = {
			hostname: 'www.bungie.net',
			port: 443,
			method: 'GET',
			doNotFollowRedirect: false,
			responseType: 'JSON',
		};
		if (requestOptions) Object.assign(defaultOptions, requestOptions);
		this.requester = new MyRequester(defaultOptions);
		this.RateLimiter = new RateLimiter({
			operations: 100,
			rate: 10000,
			delay: 10000,
			returnTokenOnCompletion: false,
		});
	}
	public async SendRequest<T = any>(path: string, overrideOptions?: ExtendedRequestOptions, data?: any): Promise<IBungieResponse<T> | undefined> {
		try {
			const response = await this.RateLimiter.add<IBungieResponse<T>>(this.requestToRateLimitFunc, Object.assign(overrideOptions || {}, { path: path }), data);
			return response.returnValue;
		}
		catch (e) {
			//
		}
		return undefined;
	}
	private async requestToRateLimitFunc<T>(...args: any[]): Promise<T> {
		return this.requester.request(args[0] || {}, args[1] || undefined);
	}
}

interface IContactEndpointResponse<T> {
	BungieResponse: T;
	ThrottleTime: number;
	ErrorOccurred: boolean;
}

export interface IBungieResponse<T> {
	Response: T;
	ErrorCode: number;
	ThrottledSeconds: number;
	ErrorStatus: string;
	Message: string;
	MessageData: {
		[key: string]: string;
	};
	DetailedErrorTrace: string;
}


