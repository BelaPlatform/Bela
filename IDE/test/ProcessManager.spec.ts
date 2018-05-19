import { should } from 'chai';
import * as mock from 'mock-fs';
import * as process_manager from '../src/ProcessManager';
import * as file_manager from '../src/FileManager';
import * as child_process from 'child_process';
var sinon = require('sinon');

should();

describe('ProcessManager', function(){
	describe('process management', function(){
		describe('#upload', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project': {
						'settings.json': JSON.stringify({CLArgs: {"cl_test":"_cl", "make": "make_test"}}),
						'test_file': 'old_content'
					}
				});
				sinon.spy(child_process, 'spawn');
			});
			it('should save the file', async function(){
				await process_manager.upload({
					currentProject: 'test_project',
					newFile: 'test_file',
					fileData: 'new_content'
				});
				let file_data: string = await file_manager.read_file('/root/Bela/projects/test_project/test_file');
				file_data.should.equal('new_content');
				(child_process.spawn as any).callCount.should.equal(0);
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
				(child_process.spawn as any).callCount.should.equal(1);
				(child_process.spawn as any).getCall(0).args.should.deep.equal([
					'make',
					[
						'--no-print-directory',
						'-C',
						'/root/Bela/',
						'syntax',
						'PROJECT=test_project',
						'CL="cl_test_cl"',
						'make_test'
					],
					{
						'detached': true
					}
				]);
			});
			afterEach(function(){
				mock.restore();
				(child_process.spawn as any).restore();
			});
		});
	});
});

