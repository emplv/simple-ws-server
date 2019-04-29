import * as fs from "fs";
import { EventEmitter } from "events";

function currentTime() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

class Logger extends EventEmitter {
  private file: fs.WriteStream;
  private opened: boolean;

  constructor() {
    super();
    this.addListeners();
    this.handleOpen();
  }

  private addListeners() {
    this.on("log", this.handleLog);
    this.on("close", this.handleClose);
  }

  private handleClose = () => {
    this.emit("log", "Server shutting down");
    this.opened = false;
    this.file.close();
  };

  private handleLog = (message: string, from?: string, closeCode?: number) => {
    if (!this.opened) {
      return;
    }
    const time = currentTime();
    let entry = `[${time}] `;
    if (from) {
      entry += `${from}: `;
    }
    entry += message;
    if (closeCode) {
      entry += ` (CODE: ${closeCode})`;
    }
    entry += "\r\n";
    this.file.write(entry);
  };

  private handleOpen() {
    const filename = `Log-${currentTime()}.log`;
    this.file = fs.createWriteStream("logs/" + filename);
    this.opened = true;
    this.emit("log", "Server started");
  }
}

export default Logger;
