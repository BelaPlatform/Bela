import * as EventEmitter from 'events';

export class Lock {
	private locked: boolean;
	private ee: EventEmitter;
	constructor(){
		this.locked = false;
		this.ee = new EventEmitter();
	}
	acquire(): Promise<void> {
		return new Promise( resolve => {
			// if the lock is free, lock it immediately
			if (!this.locked){
				this.locked = true;
				return resolve();
			}
			// otherwise sleep the thread and register a callback for when the lock is released
			let reacquire = () => {
				if (!this.locked){
					this.locked = true;
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
		setImmediate( () => this.ee.emit('release') );
	}
}

