const http = require('http');
const server = http.createServer((req, res) => {
    console.log(`REQ: ${req.method} ${req.url}`);
    console.log('HEADERS:', JSON.stringify(req.headers, null, 2));
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        console.log('BODY:', body);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: "test catch" } }));
        setTimeout(() => process.exit(0), 1000);
    });
});
server.listen(9999, '127.0.0.1', () => console.log('Listening on 9999'));
