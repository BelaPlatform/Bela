import { should } from 'chai';
import * as mock from 'mock-fs';
import * as child_process from 'child_process';
import * as git_manager from '../src/GitManager';
import * as file_manager from '../src/FileManager';
var sinon = require('sinon');

should();

describe('GitManager', function(){
	describe('manages git repos within project directories', function(){
		describe('#repo_exists', function(){
			it('should return false if no repo exists', async function(){
				mock({'/root/Bela/projects/test_project':{'test_file':'content'}});
				let out: boolean = await git_manager.repo_exists('test_project');
				out.should.equal(false);
				let out2: boolean = await git_manager.repo_exists('test_project');
				out2.should.equal(false);

			});
			it('should return true if the repo exists', async function(){
				mock({
					'/root/Bela/projects/test_project/.git': {
						'test': 'content'
					}
				});
				let out: boolean = await git_manager.repo_exists('test_project');
				out.should.equal(true);
			});
			afterEach(function(){
				mock.restore();
			});
		});
		describe('#execute', function(){
			it('should execute a git command from the correct project directory', async function(){
				mock({
					'/root/Bela/projects/test_project/.git': {'test':'test'}
				});
				let exec_stub = sinon.stub(child_process, 'exec').callsArgWith(2, null, 'stdout', 'stderr');
				let data: any = {
					command: 'test_command',
					currentProject: 'test_project'
				};
				await git_manager.execute(data);
				exec_stub.callCount.should.equal(1);
				exec_stub.getCall(0).args[0].should.equal('git test_command');
				exec_stub.getCall(0).args[1].should.deep.equal({cwd: '/root/Bela/projects/test_project/'});
				data.stdout.should.equal('stdout');
				data.stderr.should.equal('stderr');
			});
			afterEach(function(){
				mock.restore();
				sinon.restore();
			});
		});
		describe('#info', function(){
			let exec_stub: any;
			beforeEach(function(){
				exec_stub = sinon.stub(child_process, 'exec').callsArgWith(2, null, 'stdout', 'stderr');
			});
			it('should return repoExists = false if a repo does not exist', async function(){
				mock({});
				let data: any = {currentProject: 'test_project'};
				await git_manager.info(data);
				data.repoExists.should.equal(false);
				exec_stub.callCount.should.equal(0);
			});
			it('should list the repos commits, its current commit and its branches', async function(){
				mock({
					'/root/Bela/projects/test_project/.git': {'test':'content'}
				});
				let data: any = {currentProject: 'test_project'};
				await git_manager.info(data);
				data.repoExists.should.equal(true);
				data.commits.should.equal('stdout');
				data.currentCommit.should.equal('stdout');
				data.branches.should.equal('stdout');
				exec_stub.callCount.should.equal(3);
				exec_stub.getCall(0).args[0].should.equal("git log --all --pretty=oneline --format='%s, %ar %H' --graph");
				exec_stub.getCall(1).args[0].should.equal("git log -1 --format='%H'");
				exec_stub.getCall(2).args[0].should.equal("git branch");
			});
			afterEach(function(){
				mock.restore();
				sinon.restore();
			});
		});
		describe('#init', function(){
			let exec_stub: any;
			beforeEach(function(){
				exec_stub = sinon.stub(child_process, 'exec').callsArgWith(2, null, 'stdout', 'stderr');
			});
			it('should throw an error if the repo already exists', async function(){
				mock({
					'/root/Bela/projects/test_project/.git': {'test':'content'}
				});
				let data: any = {currentProject: 'test_project'};
				await git_manager.init(data).catch(function(e: Error){
					(e.toString()).should.equal('Error: repo already exists');
				});
			});
			it('should init the repo, create a .gitignore file, add everything to the repo and commit', async function(){
				mock({
					'/root/Bela/projects/test_project': {'test':'content'}
				});
				let data: any = {currentProject: 'test_project'};
				await git_manager.init(data);
				data.stdout.should.equal('stdout\nstdout\nstdout');
				data.stderr.should.equal('stderr\nstderr\nstderr');
				let gitignore = await file_manager.read_file('/root/Bela/projects/test_project/.gitignore');
				gitignore.should.equal('.DS_Store\nsettings.json\nbuild/*\ntest_project');
				exec_stub.callCount.should.equal(3);
				exec_stub.getCall(0).args[0].should.equal('git init');
				exec_stub.getCall(1).args[0].should.equal('git add -A');
				exec_stub.getCall(2).args[0].should.equal('git commit -am "first commit"');
			});
			afterEach(function(){
				mock.restore();
				sinon.restore();
			});
		});
	});
});
