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
				console.log("FAST Acquire: ", this.arg, this.lock._waitingResolvers.length);
			return new Promise( (resolve) => resolve());
		} else {
			var p = this.lock.acquireAsync();
			if("ProcessManager" === this.arg)
				console.log("SLOW Acquire: ", this.arg, this.lock._waitingResolvers.length);
			return p;
		}
	}
	release(): void {
		this.lock.release();
		if("ProcessManager" === this.arg)
			console.log("Release: ", this.arg, this.lock._waitingResolvers.length);
	}
}
