import * as boot_project from '../src/RunOnBoot';
import * as mock from 'mock-fs';
import * as child_process from 'child_process';
import {should} from 'chai';
var sinon = require('sinon');

should();

let get_boot_project_counter = 0;

describe('Manage the project running on boot', function(){
	describe('#get_boot_project', function(){
		beforeEach(function(){
			if (get_boot_project_counter === 0){
				mock({ '/opt/Bela/startup_env': 'ACTIVE=1\nPROJECT=test_project' });
			} else if (get_boot_project_counter === 1){
				mock({ '/opt/Bela/startup_env': 'ACTIVE=0\nPROJECT=test_project' });
			} else if (get_boot_project_counter === 2){
				mock({});
			}
			get_boot_project_counter += 1;
		});
		it('should return the project set to run on boot', async function(){
			let project: string = await boot_project.get_boot_project();
			project.should.equal('test_project');
		});
		it('should return none if noo project is set', async function(){
			let project: string = await boot_project.get_boot_project();
			project.should.equal('*none*');
		});
		it('should return none if no startup_env is present', async function(){
			let project: string = await boot_project.get_boot_project();
			project.should.equal('*none*');
		});
		afterEach(function(){
			mock.restore();
		});
	});
	describe('#set_boot_project', function(){
		let exec_stub: any;
		beforeEach(function(){
			exec_stub = sinon.stub(child_process, 'exec');
			mock({
				'/root/Bela/projects/test_project': {
					'settings.json': JSON.stringify({CLArgs: {'CL': 'Arg', 'make': 'make_arg'}})
				}
			});
		});
		it('should correctly disable running a project on boot', async function(){
			await boot_project.set_boot_project(undefined, '*none*');
			exec_stub.callCount.should.equal(1);
			exec_stub.getCall(0).args[0].should.equal('make --no-print-directory -C /root/Bela/ nostartup')
		});
		it('should set the project to run on boot, including CLArgs', async function(){
			await boot_project.set_boot_project(undefined, 'test_project');
			exec_stub.callCount.should.equal(1);
			exec_stub.getCall(0).args[0].should.equal('make --no-print-directory -C /root/Bela/ startuploop PROJECT=test_project CL="CLArg" make_arg');
		});
		afterEach(function(){
			mock.restore();
			sinon.restore();
		});
	});
});
