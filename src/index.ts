import * as express from "express";
import * as http from "http";
import WebSocketServer from "./Server";

const port = +process.env.port || 3210;
const app = express();

app.use(express.static("public"));
app.use(express.static("client/public"));

const server = http.createServer(app);
server.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
const ws = new WebSocketServer(server, () => {
  console.log("WebSocketServer running");
});

function Shutdown() {
  ws.shutdown(() => {
    console.log("Websocket server closed");
    server.close(() => {
      console.log("Http server closed.");
      process.exit(0);
    });
  });
}

process.on("SIGINT", Shutdown);
process.on("SIGTERM", Shutdown);
