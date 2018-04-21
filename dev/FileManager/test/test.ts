import { should } from 'chai';
import * as mock from 'mock-fs';
import { FileManager } from "../src/FileManager";

should();


var fm: FileManager = new FileManager();

describe('FileManager', function(){

	describe('primitive file and directory manipulation', function() {
	
		describe('#read_file', function() {
			var content: string = 'this is a test';
			before(function(){
				var test_file: mock.File = mock.file({content});
				mock({ test_file });
			});
			it('should read a file', async function(){
				let data: string = await fm.read_file('test_file');
				data.should.equal(content);
			});
		});

		describe('#write_file', function(){
			var content: string = 'this is still a test';
			before(function(){
				mock({});
			});
			it('should write a file', async function(){
				await fm.write_file('test_file', content);
				let data: string = await fm.read_file('test_file');
				data.should.equal(content);
			});
		});

		describe('#rename_file', function(){
			var content: string = 'yup, still a test';
			before(function(){
				mock({ 'test_file' : mock.file({content}) });
			});
			it('should rename a file', async function(){
				await fm.rename_file('test_file', 'other_file');
				let data: string = await fm.read_file('other_file');
				data.should.equal(content);
			});
		});

		describe('#delete_file', function(){
			var content: string = 'this is a test';
			before(function(){
				mock({ 'test_file' : mock.file({content}) });
			});
			it('should delete a file', async function(){
				await fm.delete_file('test_file');
				let data: string = await fm.read_file('test_file')
					.catch( e => {
						e.code.should.equal('ENOENT');
					});
			});
		});
			
		afterEach(function(){
			mock.restore();
		});
	});

});
