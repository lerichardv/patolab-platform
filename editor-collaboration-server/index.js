import 'dotenv/config';

Object.defineProperty(globalThis, '__ $YJS$ __', {
	get() {
 return false; 
},
	set() {},
	configurable: true,
});

import('./server.js');

