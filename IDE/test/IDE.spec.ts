import * as IDE from '../src/main';
import { should } from 'chai';
import * as child_process from 'child_process';
var sinon = require('sinon');

should();

describe('Top-level IDE functions', function(){
	describe('#get_xenomai_version', function(){
		it('should return the correct version string', async function(){
			let version: string = await IDE.get_xenomai_version();
			version.should.satisfy((ver: string) => (ver.includes('3.0.5') || ver.includes('2.6')));
		});
	});
	describe('#shutdown', function(){
		it('should shut the board down', function(){
			let exec_stub = sinon.stub(child_process, 'exec');
			IDE.shutdown();
			exec_stub.callCount.should.equal(1);
			exec_stub.getCall(0).args[0].should.equal('shutdown -h now');
		});
		after(function(){
			sinon.restore();
		});
	});
});
