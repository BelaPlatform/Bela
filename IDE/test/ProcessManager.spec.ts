import { should } from 'chai';
import * as mock from 'mock-fs';
import * as process_manager from '../src/ProcessManager';
import * as file_manager from '../src/FileManager';
import * as processes from '../src/IDEProcesses';
import * as socket_manager from '../src/SocketManager';
import * as cpu_monitor from '../src/CPUMonitor';
import * as child_process from 'child_process';
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
				callback(' : : : error', false, 2);
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
		describe('#stop', function(){
			let exec_stub: any;
			beforeEach(function(){
				exec_stub = sinon.stub(child_process, 'exec');
			});
			it('should stop all running processes using their stop() methods', function(){
				sinon.stub(processes.run, 'get_status').returns(true);
				sinon.stub(processes.build, 'get_status').returns(true);
				sinon.stub(processes.syntax, 'get_status').returns(true);
				let run_stop_stub = sinon.stub(processes.run, 'stop');
				let build_stop_stub = sinon.stub(processes.build, 'stop');
				let syntax_stop_stub = sinon.stub(processes.syntax, 'stop');
				process_manager.stop();
				run_stop_stub.callCount.should.equal(1);
				build_stop_stub.callCount.should.equal(1);
				syntax_stop_stub.callCount.should.equal(1);
				exec_stub.callCount.should.equal(0);
			});
			it('should call make stop if no processes are running', function(){
				let run_stop_stub = sinon.stub(processes.run, 'stop');
				let build_stop_stub = sinon.stub(processes.build, 'stop');
				let syntax_stop_stub = sinon.stub(processes.syntax, 'stop');
				process_manager.stop();
				run_stop_stub.callCount.should.equal(0);
				build_stop_stub.callCount.should.equal(0);
				syntax_stop_stub.callCount.should.equal(0);
				exec_stub.callCount.should.equal(1);
				exec_stub.getCall(0).args.should.deep.equal(['make -C /root/Bela/ stop']);
			});
			afterEach(function(){
				sinon.restore();
			});
		});
		describe('#syntax process', function(){
			let broadcast_stub: any;
			beforeEach(function(){
				broadcast_stub = sinon.stub(socket_manager, 'broadcast');
			});
			it('should broadcast a status event and object when it starts', function(){
				processes.syntax.emit('start');
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						checkingSyntax	: false,
						building	: false,
						buildProject	: '',
						running		: false,
						runProject	: ''
					}
				]);
			});
			it('should broadcast a status event and object including syntaxError when it finished', function(){
				processes.syntax.emit('finish', 'test_stderr');
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						checkingSyntax	: false,
						building	: false,
						buildProject	: '',
						running		: false,
						runProject	: '',
						syntaxError	: 'test_stderr'
					}
				]);
			});
			afterEach(function(){
				sinon.restore();
			});
		});
		describe('#build process', function(){
			let broadcast_stub: any;
			beforeEach(function(){
				broadcast_stub = sinon.stub(socket_manager, 'broadcast');
			});
			it('should broadcast a status event and object when it starts', function(){
				processes.build.emit('start');
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						checkingSyntax	: false,
						building	: false,
						buildProject	: '',
						running		: false,
						runProject	: ''
					}
				]);
			});
			it('should broadcast a status event and object including syntaxError when it finished', function(){
				processes.build.emit('finish', 'test_stderr', false);
				broadcast_stub.callCount.should.equal(2);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						checkingSyntax	: false,
						building	: false,
						buildProject	: '',
						running		: false,
						runProject	: '',
						syntaxError	: 'test_stderr'
					}
				]);
			});
			it('should broadcast a build log of its stdout', function(){
				processes.build.emit('stdout', 'test_stdout');
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						buildLog: 'test_stdout'
					}
				]);
			});
			afterEach(function(){
				sinon.restore();
			});
		});
		describe('#run process', function(){
			let broadcast_stub: any;
			beforeEach(function(){
				broadcast_stub = sinon.stub(socket_manager, 'broadcast');
			});
			it('should broadcast a status event and object when it starts, and start the cpu monitor', function(){
				let monitoring_stub = sinon.stub(cpu_monitor, 'start');
				processes.run.emit('start');
				monitoring_stub.callCount.should.equal(1);
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						checkingSyntax	: false,
						building	: false,
						buildProject	: '',
						running		: false,
						runProject	: ''
					}
				]);
			});
			it('should broadcast a status event and object when it finished', function(){
				let monitoring_stub = sinon.stub(cpu_monitor, 'stop');
				processes.run.emit('finish');
				monitoring_stub.callCount.should.equal(1);
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						checkingSyntax	: false,
						building	: false,
						buildProject	: '',
						running		: false,
						runProject	: ''
					}
				]);
			});
			it('should broadcast a log of its stdout', function(){
				processes.run.emit('stdout', 'test_stdout');
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						belaLog: 'test_stdout'
					}
				]);
			});
			it('should broadcast a log of its stderr', function(){
				processes.run.emit('stderr', 'test_stderr');
				broadcast_stub.callCount.should.equal(1);
				broadcast_stub.getCall(0).args.should.deep.equal([
					'status',
					{
						belaLogErr: 'test_stderr'
					}
				]);
			});
			afterEach(function(){
				sinon.restore();
			});
		});

	});
});

