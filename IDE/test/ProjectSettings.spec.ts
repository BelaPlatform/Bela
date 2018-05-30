import { should } from 'chai';
import * as mock from 'mock-fs';
import * as project_settings from '../src/ProjectSettings';
import * as file_manager from '../src/FileManager';

should();

describe('ProjectSettingsManager', function(){
	describe('manage project settings json file', function(){
		describe('#read', function(){
			var test_obj = {'test_key': 'test_field'};
			beforeEach(function(){
				mock({'/root/Bela/projects/test_project/settings.json': JSON.stringify(test_obj)});
			});
			it('should return a project\'s settings.json', async function(){
				let out = await project_settings.read('test_project');
				out.should.deep.equal(test_obj);
			});
			it('should create a default settings.json if one does not exist', async function(){
				let out = await project_settings.read('wrong_project');
				let out2 = await project_settings.read('wrong_project');
				out2.should.deep.equal(out);
				out.fileName.should.equal('render.cpp');
				out.CLArgs.should.be.a('object');
			});
			afterEach(function(){
				mock.restore();
			});
		});
		describe('#write', function(){
			var test_obj = {'test_key': 'test_field'};
			before(function(){
				mock({});
			});
			it('should write a project\'s settings.json', async function(){
				await project_settings.write('test_project', test_obj);
				let out = await project_settings.read('test_project');
				test_obj.should.deep.equal(out);
			});
			after(function(){
				mock.restore();
			});
		});
	});
	describe('manage project settings', function(){
		describe('#setCLArg', function(){
			before(function(){
				mock({ '/root/Bela/projects/test_project/settings.json': JSON.stringify({ CLArgs: {'old_key': 'old_value'} }) });
			});
			it('should set a single command line argument', async function(){
				let settings = await project_settings.setCLArg({
					currentProject: 'test_project', 
					key: 'key', 
					value: 'value'
				});
				settings.CLArgs['old_key'].should.equal('old_value');
				settings.CLArgs['key'].should.equal('value');
			});
			after(function(){
				mock.restore();
			});
		});
		describe('#setCLArgs', function(){
			it('should mutliple command-line arguments from an array', async function(){
				mock({ '/root/Bela/projects/test_project/settings.json': JSON.stringify({ CLArgs: {'old_key': 'old_value'} }) });
				let settings = await project_settings.setCLArgs({
					currentProject: 'test_project',
					args: [
						{ key: 'key1', value: 'value1' },
						{ key: 'key2', value: 'value2' }
					]
				});
				settings.CLArgs['old_key'].should.equal('old_value');
				settings.CLArgs['key1'].should.equal('value1');
				settings.CLArgs['key2'].should.equal('value2');
			});
			after(function(){
				mock.restore();
			});
		});
		describe('#set_fileName', function(){
			it('should set the filename field of the project settings', async function(){
				mock({});
				await project_settings.set_fileName('test_project', 'test_file');
				let settings = await file_manager.read_json('/root/Bela/projects/test_project/settings.json');
				settings.fileName.should.equal('test_file');
			});
			after(function(){
				mock.restore();
			});
		});
		describe('#restoreDefaultCLArgs', function(){
			before(function(){
				mock({ '/root/Bela/projects/test_project/settings.json': JSON.stringify({ fileName: 'test_file', CLArgs: {'-p': '2'} }) });
			});
			it('should restore a projects command-line arguments to the defauts without modifying the fileName field in the settings', async function(){
				let settings = await project_settings.restoreDefaultCLArgs({currentProject: 'test_project'});
				settings.fileName.should.equal('test_file');
				settings.CLArgs['-p'].should.equal('16');
			});
			after(function(){
				mock.restore();
			})
		});
		describe('#getArgs', function(){
			before(async function(){
				let settings = project_settings.default_project_settings();
				settings.CLArgs.make = 'AT;LDFLAGS=um';
				mock({
					'/root/Bela/projects/test/settings.json': JSON.stringify(settings)
				});
			});
			it('should correctly return the CLArgs and make parameter strings', async function(){
				let out: {CL:string, make:string[]} = await project_settings.getArgs('test');
				out.CL.should.equal('-p16 -C8 -B16 -H-6 -N1 -G1 -M0 -D0 -A0 --pga-gain-left=10 --pga-gain-right=10  -X0');
				out.make.should.deep.equal(['AT', 'LDFLAGS=um']);
			});
			after(function(){
				mock.restore();
			})
		});
	});
});
