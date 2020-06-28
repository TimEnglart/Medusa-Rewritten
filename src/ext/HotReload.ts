interface IHotReloadSettings<T> {
	exec: (HotReloader: HotReload<T>, args?: any[]) => T;
	shutdown?: (ref: T | null) => void; 
	args?: any[]
}

export default class HotReload<T = any> {
	private ref: T | null;
	constructor(private readonly options: IHotReloadSettings<T>) {
		this.ref = this.options.exec(this, this.options.args);
	}
	public reload(): void {
		this.stop();
		this.start();
	}

	public stop(): void {
		if (this.options.shutdown)
			this.options.shutdown(this.ref);
		this.ref = null;
	}

	public start(): void {
		this.ref = this.options.exec(this, this.options.args);
	}

}