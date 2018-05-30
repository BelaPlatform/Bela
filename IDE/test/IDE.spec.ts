import * as IDE from '../src/main';
import * as mock from 'mock-fs';
import * as util from '../src/utils';
import * as file_manager from '../src/FileManager';
import { should } from 'chai';
import * as child_process from 'child_process';
var sinon = require('sinon');

should();

describe('Top-level IDE functions', function(){
	describe('#get_xenomai_version', function(){
		it('should return the correct version string', async function(){
			let version: string = await IDE.get_xenomai_version();
			version.should.satisfy((ver: string) => (ver.includes('3.0') || ver.includes('2.6')));
		});
	});
	describe('#shutdown', function(){
		it('should shut the board down', function(){
			let exec_stub = sinon.stub(child_process, 'exec');
			IDE.shutdown();
			exec_stub.callCount.should.equal(1);
			exec_stub.getCall(0).args[0].should.equal('shutdown -h now');
		});
		after(function(){
			sinon.restore();
		});
	});
	describe('#check_lockfile', function(){
		it('should set stats.exists to false if the lockfile does not exist', async function(){
			mock({});
			await IDE.check_lockfile();
			let stats: util.Backup_File_Stats = IDE.get_backup_file_stats();
			stats.exists.should.equal(false);
		});
		it('should set stats.exists to false if the backup file does not exist', async function(){
			mock({
				'/root/Bela/IDE/.lockfile': '/root/Bela/projects/test_project/test_file',
			});
			await IDE.check_lockfile();
			let stats: util.Backup_File_Stats = IDE.get_backup_file_stats();
			stats.exists.should.equal(false);
		});
		it('should copy the tmp backup file to the proper backup file, and populate the stats object correctly', async function(){
			mock({
				'/root/Bela/IDE/.lockfile': '/root/Bela/projects/test_project/test_file',
				'/root/Bela/projects/test_project/.test_file~': 'test_content'
			});
			await IDE.check_lockfile();
			let stats: util.Backup_File_Stats = IDE.get_backup_file_stats();
			stats.exists.should.equal(true);
			stats.filename.should.equal('test_file');
			stats.backup_filename.should.equal('test_file.bak');
			stats.project.should.equal('test_project');
			let backup_content: string = await file_manager.read_file('/root/Bela/projects/'+stats.project+'/'+stats.backup_filename);
			backup_content.should.equal('test_content');
			(await file_manager.file_exists('/root/Bela/IDE/.lockfile')).should.equal(false);
		});
		afterEach(function(){
			mock.restore();
		});
	});
	describe('#board_detect', function(){
		it('should return a string corresponding to the board we are running on', async function(){
			let output: string = await IDE.board_detect();
			output.should.satisfy( (str: string) => str.trim() === 'Bela' || str.trim() === 'BelaMini' );
		});
	});
});
