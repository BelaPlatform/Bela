import { Lock } from '../src/Lock';

let lock = new Lock();

describe('Lock', function(){
	describe('asynchronous mutex', function(){
		var output: Number[];
		var func1 = async () => {
			await lock.acquire();
			output.push(1);
			setTimeout( () => { lock.release() }, 100);
		};
		var func2 = async () => {
			await lock.acquire();
			output.push(2);
			setTimeout( () => { lock.release() }, 100);
		};
		var func3 = async () => {
			await lock.acquire();
			output.push(3);
			lock.release();
		};
		beforeEach(function(){
			output = [];
		});
		it('should return immediately when not locked', function(done){
			func1();
			setTimeout( async () => {
				await func2();
				output.should.deep.equal([1,2]);
				done();
			}, 200);
		});
		it('should sleep threads acquiring the lock, and wake them in the right order', function(done){
			func1();
			setTimeout( async () => {
				await func2();
				output.should.deep.equal([1,2]);
			}, 25);
			setTimeout( async () => {
				await func3();
				output.should.deep.equal([1,2,3]);
				done();
			}, 50);
		});
	});
});
