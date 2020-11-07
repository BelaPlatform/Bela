// a map of queues that can store at most one element, where the
// most-recent push() overwrites any previous ones
// in other words, a map wrapped up to look like a queue.

export class MostRecentQueue {
	private q : Map<any, any>;
	constructor(){
		this.q = new Map;
	}
	count(id : any) {
		return this.q.size;
	}
	push(id : any, data : any) : boolean {
		let ret = this.q.has(id);
		this.q.set(id, data);
		return ret;
	}
	pop(id : any) : any {
		let ret = this.get(id);
		this.q.delete(id);
		return ret;
	}
	get(id : any) : any {
		return this.q.get(id);
	}
}
