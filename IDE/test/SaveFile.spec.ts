import { should } from 'chai';
import * as mock from 'mock-fs';
import * as file_manager from '../src/FileManager';
import { Lock } from '../src/Lock';
var sinon = require('sinon');

should();

describe('SaveFile', function(){
	describe('save a file safely without risk of irrecoverable data loss', function(){
		describe('#save_file', function(){
			beforeEach(function(){
				mock({
					'/root/Bela/projects/test_project': {'old_file': 'old_content'}
				});
			});
			it('should correctly save a file', async function(){
				await file_manager.save_file('/root/Bela/projects/test_project/test_file', 'test_content', 'lockfile');
				let test_file: string = await file_manager.read_file('/root/Bela/projects/test_project/test_file');
				test_file.should.equal('test_content');
			});
			it('should first write a temporary file, then delete the original file, and finally rename the temporary file', async function(){
				let write_stub = sinon.stub(file_manager, 'write_file');
				let delete_stub = sinon.stub(file_manager, 'delete_file');
				let rename_stub = sinon.stub(file_manager, 'rename_file');
				await file_manager.save_file('/root/Bela/projects/test_project/test_file', 'test_content');
				write_stub.callCount.should.equal(1);
				write_stub.getCall(0).args[0].should.equal('/root/Bela/projects/test_project/.test_file~');
				write_stub.getCall(0).args[1].should.equal('test_content');
				delete_stub.callCount.should.equal(1);
				delete_stub.getCall(0).args[0].should.equal('/root/Bela/projects/test_project/test_file');
				rename_stub.callCount.should.equal(1);
				rename_stub.getCall(0).args[0].should.equal('/root/Bela/projects/test_project/.test_file~');
				rename_stub.getCall(0).args[1].should.equal('/root/Bela/projects/test_project/test_file');
			});
			it('should create a lockfile (when given a path) containing the full path to the file being saved', async function(){
				let write_stub = sinon.stub(file_manager, 'write_file');
				let delete_stub = sinon.stub(file_manager, 'delete_file');
				let rename_stub = sinon.stub(file_manager, 'rename_file');
				await file_manager.save_file('/root/Bela/projects/test_project/test_file', 'test_content', 'lockfile');
				write_stub.callCount.should.equal(2);
				write_stub.getCall(0).args[0].should.equal('lockfile');
				write_stub.getCall(0).args[1].should.equal('/root/Bela/projects/test_project/test_file');
				delete_stub.callCount.should.equal(2);
				delete_stub.getCall(1).args[0].should.equal('lockfile');
			});
			it('should re-throw any errors after releasing its lock', async function(){
				let delete_stub = sinon.stub(file_manager, 'delete_file').throws(new Error('ohai'));
				await file_manager.save_file('/root/Bela/projects/test_project/test_file', 'test_content')
					.catch( async (e: Error) => {
						e.toString().should.equal('Error: ohai');
						await file_manager.save_file('/root/Bela/projects/test_project/test_file', 'test_content')
							.catch( (new_e: Error) => {
								new_e.toString().should.equal('Error: ohai');
							});
					});
			});
			afterEach(function(){
				mock.restore();
				sinon.restore();
			});
		});
	});
});

