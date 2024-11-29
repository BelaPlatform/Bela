import * as fs from 'fs';

let xenomaiStatPath = '/proc/xenomai/sched/stat';

// small utilities to minimise dependencies
async function getFile(file: string)
{
	return new Promise<string|null>((resolve, reject) => {
		fs.readFile(file, 'utf8', (err: any, data: any) => {
			resolve(err ? null : data);
		});
	});
}
async function getLine(file: string, match: RegExp)
{
	return new Promise<string|null>(async (resolve, reject) => {
		let data = await getFile(file);
		if(!data) {
			resolve(null);
			return;
		}
		let line = data.match(match);
		if(!line) {
			resolve(null);
			return;
		}
		resolve(line.toString());
	});
}

function computeCPU(xenomaiStat: string, linux: number) {
	const nameIndex = 8;
	const CPUIndex = 7;
	const rootName = '[ROOT]';
	const IRQName = '[IRQ16:';
	const NORMAL_MSW = 1;
	let xenomaiCPU = 0;
	let rootCPU = 1;
	let msw = 0;
	// extract the data from the output
	var lines = xenomaiStat.split('\n');
	var taskData : Array<Array<string>>= [];
	for (var j = 0; j < lines.length; j++){
		taskData.push([] as Array<string>);
		let elements = lines[j].split(' ');
		for (var k = 0; k < elements.length; k++){
			if (elements[k]){
				taskData[j].push(elements[k]);
			}
		}
	}
	var output = [];
	let audioThreadCpu = 0;
	for (var j = 0; j < taskData.length; j++){
		if (taskData[j].length){
			var proc = {
				'name'	: taskData[j][nameIndex] as string,
				'cpu'	: parseFloat(taskData[j][CPUIndex]),
				'msw'	: parseInt(taskData[j][2]),
			};
			if (proc.name === rootName)
				rootCPU = proc.cpu * 0.01;
			if (proc.name === 'bela-audio')
			{
				msw = Math.max(0, proc.msw - NORMAL_MSW);
				audioThreadCpu = proc.cpu;
			}
			// ignore uninteresting data
			if (proc && proc.name && proc.name !== rootName && proc.name !== 'NAME' && proc.name !== IRQName){
				output.push(proc);
			}
		}
	}

	for (var j = 0; j < output.length; j++){
		xenomaiCPU += output[j].cpu;
	}
	let cpu = xenomaiCPU + linux * rootCPU;
	return({cpu, audioThreadCpu, msw});
}

// https://stackoverflow.com/a/12604028/2958741
async function getStat(procstat: string, proctidstat: string)
{
	let globalStat = await getFile(procstat);
	let stat = await getFile(proctidstat);
	if(!stat || !globalStat)
		return null;

	let items = globalStat.split('\n');
	if(items.length < 1)
		return null;
	items = items[0].replace(/\s+/g, ' ').split(' ');
	let time = parseInt(items[1]) + parseInt(items[2]) + parseInt(items[3]) + parseInt(items[4]); // user, nice, system, idle

	items = stat.split(' ');
	if(items.length < 14)
		return null;
	let cpu = parseInt(items[14]) + parseInt(items[15]); // 14: user time, 15: system time
	return { time, cpu };
}

let shouldStop : boolean;
export function stop()
{
	shouldStop = true;
}

export async function getCPU(tid: string|number, callback: Function)
{
	let procstat = '/proc/stat';
	let proctidstat = `/proc/${tid}/stat`;
	let oldStat = await getStat(procstat, proctidstat);
	shouldStop = false;
	await (async () => {
		while(!shouldStop)
		{
			await delay(1000);
			if(shouldStop)
				break;
			let stat = await getStat(procstat, proctidstat);
			if(!stat)
				break;
			let cpuDiff = stat.cpu - oldStat.cpu;
			let timeDiff = stat.time - oldStat.time;
			oldStat = stat;
			let xstat = await getFile(xenomaiStatPath);
			let res = computeCPU(xstat, cpuDiff / timeDiff* 100);
			if(shouldStop)
				break;
			callback(res);
		}
	})()
}

export async function findTid() {
	let line = await getLine(xenomaiStatPath, /.*bela-audio.*/);
	if(!line)
		return -1;
	let tid = line.replace(/[\t\s]+/g, ' ').trim().split(' ')[1];
	return parseInt(tid);
}

let delay = async (ms: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

if(!module.parent) {
	// if running stand-alone (not imported)
	(async () => {
		while(1) {
			let tid = await findTid();
			if(tid >= 0)
				await getCPU(tid, (stat: any) => {
					console.log(stat.msw + ' ' + stat.cpu.toFixed(1) + '% ' + stat.audioThreadCpu.toFixed(1) + '%');
				});
			await delay(1000);
		}
	})()
}
