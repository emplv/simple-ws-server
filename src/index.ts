import * as http from "http";
import WebSocketServer from "./server";

const port = +process.env.port || 3210;
const server = http.createServer((req, res) => {
  res.end("Nothing here");
});
server.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
const ws = new WebSocketServer(server, () => {
  console.log("WebSocketServer running");
});

function Shutdown() {
  ws.shutdown(() => {
    console.log('Websocket server closed');
    server.close(() => {
      console.log('Http server closed.');
      process.exit(0);
    });
  });
};

process.on('SIGINT', Shutdown);
process.on('SIGTERM', Shutdown);
