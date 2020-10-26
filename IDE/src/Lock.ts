import AwaitLock from 'await-lock';

export class Lock {
	private lock: AwaitLock;
	private arg: string;
	constructor(arg? : string){
		this.lock = new AwaitLock();
		this.arg = arg;
	}
	acquire(): Promise<void> {
		let ret = this.lock.tryAcquire();
		if(ret) {
			if("ProcessManager" === this.arg)
				console.log("FAST Acquire: ", this.arg);
			return new Promise( (resolve) => resolve());
		} else {
			if("ProcessManager" === this.arg)
				console.log("SLOW Acquire: ", this.arg);
			return this.lock.acquireAsync();
		}
	}
	release(): void {
		if("ProcessManager" === this.arg)
			console.log("Release: ", this.arg);
		this.lock.release();
	}
}
