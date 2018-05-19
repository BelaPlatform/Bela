import { should } from 'chai';
import * as mock from 'mock-fs';
import * as process_manager from '../src/ProcessManager';
import * as file_manager from '../src/FileManager';
import * as processes from '../src/IDEProcesses';
var sinon = require('sinon');

should();

describe('ProcessManager', function(){
	describe('process management', function(){
		describe('#upload', function(){
			let stub: any;
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'test_file': 'old_content'
					}
				});
				stub = sinon.stub(processes.syntax, 'start');
			});
			it('should save the file', async function(){
				await process_manager.upload({
					currentProject: 'test_project',
					newFile: 'test_file',
					fileData: 'new_content'
				});
				let file_data: string = await file_manager.read_file('/root/Bela/projects/test_project/test_file');
				file_data.should.equal('new_content');
				stub.callCount.should.equal(0);
			});
			it('should check the syntax', async function(){
				await process_manager.upload({
					currentProject: 'test_project',
					newFile: 'test_file',
					fileData: 'new_content',
					checkSyntax: true
				});
				let file_data: string = await file_manager.read_file('/root/Bela/projects/test_project/test_file');
				file_data.should.equal('new_content');
				stub.callCount.should.equal(1);
			});
			afterEach(function(){
				mock.restore();
				sinon.restore();
			});
		});
		describe('#checkSyntax', function(){
			let run_stop_stub: any;
			beforeEach(function(){
				run_stop_stub = sinon.stub(processes.run, 'stop');
			});
			it('should start a syntax check', function(){
				let stub = sinon.stub(processes.syntax, 'start');
				process_manager.checkSyntax({currentProject: 'test_project'});
				stub.callCount.should.equal(1);
				stub.getCall(0).args.should.deep.equal(['test_project']);
				run_stop_stub.callCount.should.equal(0);
			});
			it('should stop an in-progress syntax check, and queue a new one to be started', function(){
				sinon.stub(processes.syntax, 'get_status').returns(true);
				let stop_stub = sinon.stub(processes.syntax, 'stop');
				let start_stub = sinon.stub(processes.syntax, 'start');
				let queue_stub = sinon.stub(processes.syntax, 'queue');
				process_manager.checkSyntax({currentProject: 'test_project'});
				stop_stub.callCount.should.equal(1);
				queue_stub.callCount.should.equal(1);
				start_stub.callCount.should.equal(0);
				let callback = queue_stub.getCall(0).args[0];
				callback();
				start_stub.callCount.should.equal(1);
				start_stub.getCall(0).args[0].should.equal('test_project');
				run_stop_stub.callCount.should.equal(0);
			});
			it('should stop an in-progress build process, and queue a new syntax check to be started', function(){
				sinon.stub(processes.build, 'get_status').returns(true);
				let stop_stub = sinon.stub(processes.build, 'stop');
				let start_stub = sinon.stub(processes.syntax, 'start');
				let queue_stub = sinon.stub(processes.build, 'queue');
				process_manager.checkSyntax({currentProject: 'test_project'});
				stop_stub.callCount.should.equal(1);
				queue_stub.callCount.should.equal(1);
				start_stub.callCount.should.equal(0);
				let callback = queue_stub.getCall(0).args[0];
				callback();
				start_stub.callCount.should.equal(1);
				start_stub.getCall(0).args[0].should.equal('test_project');
				run_stop_stub.callCount.should.equal(0);
			});
			afterEach(function(){
				sinon.restore();
			});
		});
		describe('#run', function(){
			let stubs: any;
			beforeEach(function(){
				stubs = {};
				stubs.build_start = sinon.stub(processes.build, 'start');
				stubs.build_stop = sinon.stub(processes.build, 'stop');
				stubs.build_queue = sinon.stub(processes.build, 'queue');
				stubs.run_start = sinon.stub(processes.run, 'start');
				stubs.run_stop = sinon.stub(processes.run, 'stop');
				stubs.run_queue = sinon.stub(processes.run, 'queue');
				stubs.syntax_stop = sinon.stub(processes.syntax, 'stop');
				stubs.syntax_queue = sinon.stub(processes.syntax, 'queue');
			});
			it('should build a project and if successful run the project', function(){
				process_manager.run({currentProject: 'test_project'});
				stubs.build_start.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(1);
				let callback = stubs.build_queue.getCall(0).args[0];
				callback('', false);
				stubs.run_start.callCount.should.equal(1);
				stubs.run_start.getCall(0).args[0].should.equal('test_project');
			});
			it('should run the project even if there are build warnings', function(){
				process_manager.run({currentProject: 'test_project'});
				stubs.build_start.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(1);
				let callback = stubs.build_queue.getCall(0).args[0];
				callback(' : : : warning', false);
				stubs.run_start.callCount.should.equal(1);
				stubs.run_start.getCall(0).args[0].should.equal('test_project');
			});
			it('should not run the project if there are build errors', function(){
				process_manager.run({currentProject: 'test_project'});
				stubs.build_start.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(1);
				let callback = stubs.build_queue.getCall(0).args[0];
				callback(' : : : error', false);
				stubs.run_start.callCount.should.equal(0);
			});
			it('should not run the project if the build process is killed by a call to stop()', function(){
				process_manager.run({currentProject: 'test_project'});
				stubs.build_start.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(1);
				let callback = stubs.build_queue.getCall(0).args[0];
				callback('', true);
				stubs.run_start.callCount.should.equal(0);
			});
			it('should stop a running run process and queue a build then a run process', function(){
				sinon.stub(processes.run, 'get_status').returns(true);
				process_manager.run({currentProject: 'test_project'});
				stubs.run_stop.callCount.should.equal(1);
				stubs.run_queue.callCount.should.equal(1);
				let callback1 = stubs.run_queue.getCall(0).args[0];
				callback1();
				stubs.build_start.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(1);
				let callback2 = stubs.build_queue.getCall(0).args[0];
				callback2('', false);
				stubs.run_start.callCount.should.equal(1);
			});
			it('should stop a running build process and queue a build then a run process', function(){
				sinon.stub(processes.build, 'get_status').returns(true);
				process_manager.run({currentProject: 'test_project'});
				stubs.build_stop.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(1);
				let callback1 = stubs.build_queue.getCall(0).args[0];
				callback1();
				stubs.build_start.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(2);
				let callback2 = stubs.build_queue.getCall(1).args[0];
				callback2('', false);
				stubs.run_start.callCount.should.equal(1);
			});
			it('should stop a running syntax process and queue a build then a run process', function(){
				sinon.stub(processes.syntax, 'get_status').returns(true);
				process_manager.run({currentProject: 'test_project'});
				stubs.syntax_stop.callCount.should.equal(1);
				stubs.syntax_queue.callCount.should.equal(1);
				let callback1 = stubs.syntax_queue.getCall(0).args[0];
				callback1();
				stubs.build_start.callCount.should.equal(1);
				stubs.build_queue.callCount.should.equal(1);
				let callback2 = stubs.build_queue.getCall(0).args[0];
				callback2('', false);
				stubs.run_start.callCount.should.equal(1);
			});
			afterEach(function(){
				sinon.restore();
			});
		});
	});
});

