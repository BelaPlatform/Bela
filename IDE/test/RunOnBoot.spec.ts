import * as boot_project from '../src/RunOnBoot';
import * as mock from 'mock-fs';
import {should} from 'chai';

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
			project.should.equal('none');
		});
		it('should return none if no startup_env is present', async function(){
			let project: string = await boot_project.get_boot_project();
			project.should.equal('none');
		});
		afterEach(function(){
			mock.restore();
		});
	});
});
