import * as EventEmitter from 'events';

export class Lock {
	private locked: boolean;
	private ee: EventEmitter;
	constructor(){
		this.locked = false;
		this.ee = new EventEmitter();
		// without this we sometimes get a warning when more than 10 threads hold the lock
		this.ee.setMaxListeners(100);
	}
	acquire(): Promise<void> {
		return new Promise( resolve => {
			// if the lock is free, lock it immediately
			if (!this.locked){
				this.locked = true;
				// console.log('lock acquired');
				return resolve();
			}
			// otherwise sleep the thread and register a callback for when the lock is released
			let reacquire = () => {
				if (!this.locked){
					this.locked = true;
					// console.log('lock acquired');
					this.ee.removeListener('release', reacquire);
					return resolve();
				}
			};
			this.ee.on('release', reacquire);
		});
	}
	release(): void{
		// unlock and call any queued callbacks
		this.locked = false;
		// console.log('lock released');
		setImmediate( () => this.ee.emit('release') );
	}
}

