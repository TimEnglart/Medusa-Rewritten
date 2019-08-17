class RateLimiter {
	private _operations: number;
	private _rate: number;
	private _delay: number;
	private _paused: boolean = false;

	private _queue: Queue<IProcessingRateLimiterObject>;

	private _executing: number = 0;




	private _stdOut: (message?: any) => void;
	private _stdErr: (message?: any) => void;

	private _interval: number = 0;

	constructor(options: RateLimiterOptions = {}) {
		this._operations = options.operations || 1;
		this._rate = options.rate || 1000;
		this._delay = options.delay || 4000;


		// tslint:disable-next-line: no-console
		this._stdOut = options.stdOut || console.log;
		// tslint:disable-next-line: no-console
		this._stdErr = options.stdErr || console.error;

		this._queue = new Queue();
	}

	public add(fn: () => void, callback?: (response: ICompletedRateLimiterObject, err?: Error) => void): void {
		const rateLimitedCall: IProcessingRateLimiterObject = {
			callback,
			function: fn,
			seed: Math.random().toString().slice(2, 11),
			timeAdded: Date.now(),
			promise: new Promise((resolve: (fn: void) => void) => {
				return resolve(fn());
			})
		};
		this._queue.enqueue(rateLimitedCall);
		this.process();
		// do queuing magic
	}

	public addP(fn: () => void): Promise<ICompletedRateLimiterObject> {
		return new Promise((resolve, reject) => {
			this.add(fn, (response: ICompletedRateLimiterObject, err?: Error) => {
				if (err) reject(err);
				return resolve(response);
			});
		});
	}
	public pause() {
		this._paused = true;
	}
	public start() {
		this._paused = false;
	}
	private process(runs: number = 0) {
		if (this._interval >= this._rate * this.operations && !this.canStartTask) {
			this.coolDown();
		}
		else if (this._queue.populated && !this.paused && this.canStartTask) {
			const request = this._queue.dequeue();
			if (!request) return;
			this._interval += this.operationWeight;
			this._executing++;
			request.function();
			if (request.callback) {
				// tslint:disable-next-line: no-floating-promises
				request.promise.then(r => {
					request.callback!(Object.assign(request, {
						timeCompleted: Date.now()
					}) as ICompletedRateLimiterObject);
				});
			}

			setTimeout(() => { this._executing--; this._interval -= this.operationWeight; }, this._rate);
			if (runs > 0) this.process(--runs);
		}
	}
	private coolDown() {
		if (this.paused) return;
		this.pause();
		setTimeout(() => {
			this.start();
			if (this._executing === 0) this.process(this._operations);
		}, this.delay);
	}
	private get canStartTask() {
		return this._executing < this._operations;
	}

	private get operationWeight() {
		return this.rate / this._operations;
	}

	get paused() {
		return this._paused;
	}



	get pendingRequests() {
		return this._queue.toArray();
	}
	get nextRequest() {
		return this._queue.firstElement;
	}
	get delay() {
		return this._delay;
	}
	set delay(milliseconds: number) {
		this._delay = milliseconds;
	}
	get rate() {
		return this._rate;
	}
	set rate(milliseconds: number) {
		this._rate = milliseconds;
	}
	get operations() {
		return this._operations;
	}
	set operations(milliseconds: number) {
		this._operations = milliseconds;
	}
}

interface IRateLimiterObject {
	seed: string;
	timeAdded: number;
	function: () => void;
	callback?: (response: ICompletedRateLimiterObject, err?: Error) => void;
}
interface IProcessingRateLimiterObject {
	seed: string;
	timeAdded: number;
	function: () => void;
	promise: Promise<void>;
	callback?: (response: ICompletedRateLimiterObject, err?: Error) => void;
}
interface ICompletedRateLimiterObject {
	timeCompleted: number;
	timeAdded: number;
	function: () => void;
	callback?: (response: ICompletedRateLimiterObject, err?: Error) => void;
}

interface RateLimiterOptions {
	operations?: number; // Number of Allowed Operations During Rate Limit
	rate?: number; // How Long to Wait for max operations to be hit to implement delay
	delay?: number; // Once Rate Limit is Hit How long to wait

	stdOut?: void;
	stdErr?: void;
}
interface ILinkedListNode<T> {
	next?: ILinkedListNode<T>;
	data: T;
}
// tslint:disable-next-line: max-classes-per-file
class Queue<T> {
	private head?: ILinkedListNode<T>;
	private tail?: ILinkedListNode<T>;
	constructor(...items: T[]) {
		if (items.length) this.enqueue(...items);
	}
	public enqueue(...items: T[]) {
		for (const item of items) {
			const node: ILinkedListNode<T> = {
				data: item
			};
			if (!this.head) this.head = node;
			else this.tail!.next = node;
			this.tail = node;
		}
	}
	public dequeueNode() {
		let nodeData: ILinkedListNode<T> | undefined;
		if (this.head) {
			nodeData = this.head;
			this.head = this.head.next;
		}
		return nodeData;
	}
	public dequeue() {
		const nodeData = this.dequeueNode();
		return nodeData ? nodeData.data : undefined;
	}
	get firstNode() {
		return this.head;
	}
	get firstElement() {
		return this.head ? this.head.data : undefined;
	}
	get populated() {
		return this.head !== undefined;
	}
	get size() {
		let size = 0;
		let node = this.head;
		while (node) {
			size++;
			node = node.next;
		}
		return size;
	}
	public toArray() {
		const list = [];
		let node = this.head;
		while (node) {
			list.push(node.data);
			node = node.next;
		}
		return list;
	}
	public clear() {
		let node;
		do {
			node = this.dequeueNode();
		} while (node);
	}
}

export { RateLimiter };