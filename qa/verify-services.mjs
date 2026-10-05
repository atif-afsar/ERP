const be = await fetch('http://127.0.0.1:5111/health').then(r => r.json()).catch(e => ({ error: e.message }));
const fe = await fetch('http://127.0.0.1:5191/').then(r => r.status).catch(e => ({ error: e.message }));
console.log(JSON.stringify({ backend: be, frontend: fe }));
