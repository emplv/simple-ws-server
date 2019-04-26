import * as crypto from "crypto";
import { EventEmitter } from "events";
import * as http from "http";
import { Socket } from "net";
import { URL } from "url";
import * as Logger from "./Logger";
import WS from "./socket";

class WebSocketServer extends EventEmitter {
  private server: http.Server;
  private users: Map<string, WS>;

  constructor(server: http.Server, callback?: () => void) {
    super();
    if (!server) {
      throw new Error("WebSocketServer needs server");
    }
    this.server = server;
    this.users = new Map();
    this.addListeners();
    Logger.openLog();
    Logger.log("Server started");
    callback && callback();
  }

  public acceptKeyValue(acceptKey: string) {
    return crypto
      .createHash("sha1")
      .update(acceptKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");
  }

  public broadcast(
    message: string,
    from?: string,
    excludeUsers: string[] = [],
    closeCode?: number
  ) {
    if (from && !excludeUsers.includes(from)) {
      excludeUsers.push(from);
    }
    const data = constructMessage(message, from);
    Logger.log(message, from, closeCode);
    this.users.forEach((socket, user) => {
      if (!excludeUsers.includes(user)) {
        socket.emit("send", data);
      }
    });
  }

  public closeSocket(username: string) {
    this.users.delete(username);
  }

  public shutdown(callback?: () => void) {
    this.users.forEach(async socket => {
      await socket.emit("close");
    });
    Logger.log("Server shutting down");
    Logger.closeLog();
    callback && callback();
  }

  private addListeners() {
    this.server.ref();
    this.server.on("upgrade", this.handleUpgrade);
  }

  /**
   * @description - implement user authorization, currently taken from url search param
   * @returns
   * @param username - if auth succefull, or null if failed
   */
  private authorizeUser(req: Request, origin: string) {
    const url = new URL(req.url, origin);
    const username = decodeURIComponent(url.searchParams.get("username"));
    if (!this.users.has(username)) {
      return username;
    }
    return null;
  }

  private handleUpgrade = (req: Request, socket: Socket) => {
    // Close connection if missing "upgrade: websocket" header
    if (req.headers["upgrade"] !== "websocket") {
      socket.end("HTTP/1.1 400 Bad Request");
      return;
    }
    const origin = req.headers["origin"];
    if (!this.validateOrigin(origin)) {
      socket.end("HTTP/1.1 400 Bad origin");
      return;
    }
    const username = this.authorizeUser(req, origin);
    if (!username) {
      socket.end("HTTP/1.1 400 Bad username");
      return;
    }
    // build base handshake response
    let response = "HTTP/1.1 101 Switching Protocols\r\n";
    response += "Upgrade: websocket\r\n";
    response += "Connection: Upgrade\r\n";
    // add accept key
    response += `Sec-WebSocket-Accept: ${this.acceptKeyValue(
      req.headers["sec-websocket-key"]
    )}\r\n`;
    // check if client offered valid subprotocol
    const protocol = req.headers["sec-websocket-protocol"];
    const protocols = !protocol ? [] : protocol.split(",").map(s => s.trim());
    if (protocols.includes("json")) {
      // currently accept only json
      response += "Sec-WebSocket-Protocol: json\r\n";
    } else {
      socket.end("HTTP/1.1 400 Bad subprotocol");
      return;
    }
    // respond to the client handshake
    const handshake = `${response}\r\n`;
    socket.write(handshake, error => {
      if (error) {
        socket.end("HTTP/1.1 400 Bad handshake");
        return;
      }
      const ws = new WS(this, socket, username);
      this.users.set(username, ws);
    });
  };

  /**
   * @description Allow to create websocket connection from listed origin
   * @param origin
   * @returns
   * @param boolean indicating if origin is valid
   */
  private validateOrigin(origin: string) {
    // currently no real validation
    if (origin && origin !== "null") {
      return true;
    }
    return false;
  }
}

function constructMessage(message: string, from?: string) {
  // Convert the data to JSON and copy it into a buffer
  const json = JSON.stringify({ message, from });
  const jsonByteLength = Buffer.byteLength(json);
  const lengthByteCount = jsonByteLength < 126 ? 0 : 2;
  const payloadLength = lengthByteCount === 0 ? jsonByteLength : 126;
  const buffer = Buffer.alloc(2 + lengthByteCount + jsonByteLength);
  buffer.writeUInt8(0b10000001, 0);
  buffer.writeUInt8(payloadLength, 1);
  let payloadOffset = 2;
  if (lengthByteCount > 0) {
    buffer.writeUInt16BE(jsonByteLength, 2);
    payloadOffset += lengthByteCount;
  }
  buffer.write(json, payloadOffset);
  return buffer;
}

export default WebSocketServer;
