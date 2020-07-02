import { MyRequester, IExtendedRequestOptions } from "./webClient";
// import { BungieResponse } from "./discordToBungie";
import RateLimiter from "@timenglart/limited-rate-limiter";
import { Logger, LogFilter } from "./logger";

class BungieAPIError<T> extends Error {
	constructor(bungieResponse: EndPointError<IBungieResponse<T>>) {
		super(bungieResponse.ErrorType);
	}
}
interface EndPointError<T> {
	ErrorType: string;
	Response: T;
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
export default class BungieAPIRequester {
	public numberOfRetries = 0;
	private requester: MyRequester;
	private RateLimiter: RateLimiter;
	constructor(apiKey: string, private readonly logger: Logger, requestOptions?: IExtendedRequestOptions) {
		const defaultOptions: IExtendedRequestOptions = {
			hostname: 'www.bungie.net',
			port: 443,
			method: 'GET',
			doNotFollowRedirect: false,
			responseType: 'JSON',
			headers: {
				'X-API-Key': apiKey,
			},
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
	public async SendRequest<T = any>(path: string, overrideOptions?: IExtendedRequestOptions, data?: unknown): Promise<IBungieResponse<T> | undefined> {
		try {
			const response = await this.RateLimiter.addPromise<Promise<IBungieResponse<T>>>(
				this.requestToRateLimitFunc,
				this.requester,
				Object.assign(overrideOptions || {}, { path: '/Platform' + path }),
				data,
			);
			this.logger.logS(`[BungieAPI Request Complete]:\nTo Path: ${path}\nTime to Complete: ${response.timeCompleted - response.timeAdded}ms`, LogFilter.Debug);
			const bungieResponse = response.returnValue;
			// Maybe do some checks\
			if(bungieResponse) {
				if(bungieResponse.ErrorCode !== 1)
					this.logger.logS(
						`[BungieAPI Response Error]: Request Succeeded But Error Has Been Received:\nError Code: ${bungieResponse.ErrorCode}\nError Status: ${bungieResponse.ErrorStatus}\nError Message: ${bungieResponse.Message}`,
						LogFilter.Error,
					);
				return bungieResponse;
			}
		}
		catch (e) {
			this.logger.logS('[BungieAPI Error]: ' + e, LogFilter.Error);
		}
		return undefined;
	}
	private async requestToRateLimitFunc<T>(...args: RequestVariadic): Promise<IBungieResponse<T>> {
		return await args[0].request(args[1], args[2]);
	}
}

type RequestVariadic = [MyRequester, IExtendedRequestOptions, unknown];
interface IRequestArgs {
	requester: MyRequester;
	options: IExtendedRequestOptions;
	data: any;
}
interface IContactEndpointResponse<T> {
	BungieResponse: T;
	ThrottleTime: number;
	ErrorOccurred: boolean;
}
