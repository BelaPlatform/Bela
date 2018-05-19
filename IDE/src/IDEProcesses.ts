import { MakeProcess } from './MakeProcess';

export const syntax: MakeProcess = new MakeProcess('syntax');
export const build: MakeProcess = new MakeProcess('all');
export const run: MakeProcess = new MakeProcess('runide');

