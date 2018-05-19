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
	});
});

