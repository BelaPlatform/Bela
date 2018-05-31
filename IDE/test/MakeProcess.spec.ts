import { should } from 'chai';
import * as mock from 'mock-fs';
import {MakeProcess} from '../src/MakeProcess';
import * as child_process from 'child_process';
import * as EventEmitter from 'events';
var sinon = require('sinon');

should();

describe('MakeProcess', function(){
	describe('a class representing individual make processes', function(){
		describe('#start', function(){
			let test_process: MakeProcess;
			before(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'settings.json': JSON.stringify({CLArgs: {"cl_test":"_cl", "make": "make_test"}})
					}
				});
				let stub: any = new EventEmitter();
				stub.stdout = new EventEmitter();
				stub.stdout.setEncoding = function(){};
				stub.stderr = new EventEmitter();
				stub.stderr.setEncoding = function(){};
				sinon.stub(child_process, 'spawn').returns(stub);
				test_process = new MakeProcess('test_target');
			});
			it('should spawn a make process with the correct arguments', async function(){
				await test_process.start('test_project');
				(child_process.spawn as any).callCount.should.equal(1);
				(child_process.spawn as any).getCall(0).args.should.deep.equal([
					'make',
					[
						'--no-print-directory',
						'-C',
						'/root/Bela/',
						'test_target',
						'PROJECT=test_project',
						'CL=cl_test_cl',
						'make_test'
					],
					{
						'detached': true
					}
				]);
			});
			afterEach(function(){
				mock.restore();
				sinon.restore();
			});
		});
		describe('#queue', function(){
			let test_process: MakeProcess;
			let stub: any;
			before(function(){
				stub = new EventEmitter();
				stub.stdout = new EventEmitter();
				stub.stdout.setEncoding = function(){};
				stub.stderr = new EventEmitter();
				stub.stderr.setEncoding = function(){};
				sinon.stub(child_process, 'spawn').returns(stub);
				test_process = new MakeProcess('test_target');
			});
			it('queue a callback fired when the process ends', async function(){
				test_process.queue( (stderr: string, killed: boolean) => {
					stderr.should.equal('');
					killed.should.equal(false);
				});
				await test_process.start('test_project');
				stub.emit('close');
			});
			afterEach(function(){
				mock.restore();
				sinon.restore();
			});
		});
	});
});


