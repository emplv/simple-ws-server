import { EventEmitter } from "events";
import { Socket } from "net";
import { parseFrame } from "./parseFrame";
import WebSocketServer from "./server";

const timeout = +process.env.timeout || 30000;
const DisconnectMessages = [
  ' left (connection lost)',
  ' was disconnected due to inactivity'
];

class WS extends EventEmitter {
  private closeCode: number;
  private socket: Socket;
  private server: WebSocketServer;
  private timedOut: boolean = false;
  private username: string;

  constructor(server: WebSocketServer, socket: Socket, username: string) {
    super();
    this.username = username;
    this.socket = socket;
    this.server = server;
    this.addListeners();
    this.server.broadcast(`${username} has connected`);
  }

  private addListeners() {
    this.socket.ref();
    this.socket.on("data", this.handleData);
    this.socket.once("close", this.handleClose);
    this.socket.on("timeout", this.handleTimeout);
    this.socket.setTimeout(timeout);
    this.on("send", this.handleSend);
  }

  private removeListeners() {
    this.socket.unref();
    this.removeAllListeners("send");
  }

  private handleClose = () => {
    this.removeListeners();
    this.server.closeSocket(this.username);
    this.socket.end();
    const message = this.username + DisconnectMessages[this.timedOut ? 1 : 0];
    this.server.broadcast(message, null, [], this.closeCode);
  };

  private handleData = (buffer: Buffer) => {
    const { data, end } = parseFrame(this.username, buffer);
    if (end) {
      this.closeCode = end;
      this.socket.emit("close");
      return;
    }
    if (data) {
      this.server.broadcast(data, this.username);
    }
  };

  private handleSend(data: Buffer) {
    this.socket.write(data);
  }

  private handleTimeout = () => {
    this.timedOut = true;
    this.socket.emit("close");
  };
}

export default WS;
