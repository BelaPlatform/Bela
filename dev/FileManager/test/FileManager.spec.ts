import { should } from 'chai';
import * as mock from 'mock-fs';
import { FileManager, File_Descriptor } from "../src/FileManager";

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
				let data2: string = await fm.read_file('test_file')
					.catch( e => {
						e.code.should.equal('ENOENT');
					});
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

		describe('#read_directory', function(){
			let file_list: string[] = ['test_file1', 'test_file2', 'test_file3'];
			before(function(){
				let mock_dir: any = {};
				mock_dir[file_list[0]] = 'test';
				mock_dir[file_list[1]] = 'test';
				mock_dir[file_list[2]] = 'test';
				mock({ 'test_dir': mock_dir });
			});
			it('should return an array of the names of the files in a directory', async function(){
				let output: string[] = await fm.read_directory('test_dir');
				output.should.deep.equal(file_list);
			});
		});

		describe('#stat_file', function(){
			before(function(){
				mock({ 'test_file': 'test' });
			})
			it('should return an object with a size field and isDirectory method', async function(){
				let stat = await fm.stat_file('test_file');
				stat.size.should.be.a('Number');
				stat.isDirectory.should.be.a('Function');
				stat.isDirectory().should.equal(false);
			});
		});
			
		describe('#is_binary', function(){
			beforeEach(function(){
				mock({ 'test_text': 'test', 'test_bin': new Buffer(100) });
			})
			it('should return true for a binary file', async function(){
				let result = await fm.is_binary('test_bin');
				result.should.equal(true);
			});
			it('should return false for a non-binary file', async function(){
				let result = await fm.is_binary('test_text');
				result.should.equal(false);
			});
		});

		describe('#make_symlink', function(){
			var content = 'test_content';
			beforeEach(function(){
				mock({ 'test_src': content });
			})
			it('should create a symlink', async function(){
				await fm.make_symlink('test_src', 'test_dir/test_dest');
				let data: string = await fm.read_file('test_dir/test_dest');
				data.should.equal(content);
			});
		});
		afterEach(function(){
			mock.restore();
		});
	});

	describe('Sophisticated file and directory manipulation', function(){

		describe('#save_file', function(){
			var content: string = 'this is a test';
			var file_name: string = 'test_file';
			var lockfile: string = '.lockfile';
			beforeEach(function(){
				mock({});
			});
			it('should save a file following vim\'s strategy to avoid data loss', async function(){
				await fm.save_file(file_name, content, lockfile);
				let data: string = await fm.read_file(file_name);
				data.should.equal(content);
			});
			it('should also work without using a lockfile', async function(){
				await fm.save_file(file_name, content);
				let data: string = await fm.read_file(file_name);
				data.should.equal(content);
			});
			afterEach(function(){
				mock.restore();
			});
		});
		
		describe('#deep_read_directory', function(){
			var root_content = [
				new File_Descriptor('dir1', undefined, [
					new File_Descriptor('dir2', undefined, [
						new File_Descriptor('file3', 6, undefined)
					]),
					new File_Descriptor('file2', 5, undefined)
				]),
				new File_Descriptor('file', 4, undefined)
			];
			before(function(){
				mock({ 
					'root': {
						'file': 'test',
						'dir1': {
							'file2': 'test2',
							'dir2': { 'file3': 'test33' }
						}
					}
				});
			});
			it('should recursively read the contents of a directory, returning an array of file descriptors', async function(){
				let output: File_Descriptor[] = await fm.deep_read_directory('root');
			//	console.dir(output, { depth: null });
				output.should.deep.equal(root_content);
			});
		});

		afterEach(function(){
			mock.restore();
		});
	});
});
