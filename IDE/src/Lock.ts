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
			console.log(this.arg, "FAST Acquire: ", this.lock._waitingResolvers.length);
			return new Promise( (resolve) => resolve());
		} else {
			var p = this.lock.acquireAsync();
			console.log(this.arg, "SLOW Acquire: ", this.lock._waitingResolvers.length);
			return p;
		}
	}
	release(): void {
		this.lock.release();
		console.log(this.arg, "Release: ", this.lock._waitingResolvers.length);
	}
}
