import {createServer} from 'http';
import {register} from 'prom-client';

const PORT = process.env.PORT || 9000;

const server = createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    register.metrics().then(m => {
      res.setHeader('Content-Type', register.contentType);
      res.statusCode = 200;
      res.write(m);
      res.end();
    });
  } else {
    res.write(`Cannot ${req.method} ${req.url}`);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Listening on PORT=${PORT}`);
});
