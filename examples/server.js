import { createServer } from 'node:http';

const port = process.env.PORT || 3000;
const name = process.env.npm_package_name || 'demo-app';
const version = process.env.npm_package_version || '1.0.0';

const server = createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
    <h1>${name} v${version}</h1>
    <p>Running on port <b>${port}</b></p>
    <p>CWD: ${process.cwd()}</p>
    <p>Environment:</p>
    <pre>${JSON.stringify(process.env, null, 2)}</pre>
  `);
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => console.log('HTTP server closed'));
});
