import * as fs from "fs";

let file: fs.WriteStream;

function currentTime() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

export function openLog() {
  const filename = `Log-${currentTime()}.log`;
  file = fs.createWriteStream("logs/" + filename);
}

export function log(message: string, from?: string, closeCode?: number) {
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
  file.write(entry);
}

export function closeLog() {
  file.close();
}
