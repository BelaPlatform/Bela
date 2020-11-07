import AwaitLock from 'await-lock';

// Simplified stacktrace function
function stacktrace() : string{
	return new Error().stack
.replace("Error", "")
.replace(/^.*stacktrace.*\n/gm, "")
.replace(/^.*Lock.*\n/gm, "")
.replace(/\/Users\/giulio\/Dropbox\/matlab\/phd\/workspace\/Bela\/IDE\/dist\//g, "")
.replace(/\/root\/Bela\/IDE\/dist\//g, "")
.replace(/^.*new Promise \(<anonymous>\).*$/gm, "")
.replace(/^.*__awaiter.*$/gm, "")
.replace(/^\s*at <anonymous>$/gm, "")
.replace(/^\s*at step \(.*$/gm, "")
.replace(/^\s*at Object.next \(.*$/gm, "")
.replace(/^\s*at Object.<anonymous>.*\(.*$/gm, "")
.replace(/^\s*at fulfilled \(.*$/gm, "")
.replace(/^\s*at [/A-Za-z]+\.js:7:.*$/gm, "")
.replace(/Object./g, "")
.replace(/\n/g, "__")
.replace(/_[_]+/g, "__")
.replace(/\s+/gm, " ")
}
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
			if(this.arg === "FileManager") {
				console.log(this.arg, "FAST Acquire: ", this.lock._waitingResolvers.length, stacktrace());
			}
			return new Promise( (resolve) => resolve());
		} else {
			if(this.arg === "FileManager") {
				console.log(this.arg, "SLOW Acquiring: ", this.lock._waitingResolvers.length, stacktrace());
			}
			var p = this.lock.acquireAsync();
			if(this.arg === "FileManager") {
				console.log(this.arg, "SLOW Acquired: ", this.lock._waitingResolvers.length, stacktrace());
			}
			return p;
		}
	}
	release(): void {
		this.lock.release();
		if(this.arg === "FileManager") {
			console.log(this.arg, "Release: ", this.lock._waitingResolvers.length, stacktrace());
		}
	}
}
