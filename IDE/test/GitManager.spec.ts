import { should } from 'chai';
import * as mock from 'mock-fs';
import * as git_manager from '../src/GitManager';

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
	});
});
