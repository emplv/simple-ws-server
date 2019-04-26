export const FrameStorage = new Map<string, string>();

export const CloseCodes = {
  goingDown: 1001,
  messageTooLarge: 1009,
  normalClose: 1000,
  policyViolation: 1008,
  protocolError: 1002,
  unexpected: 1011,
  wrongDataFormat: 1007,
  wrongFrameFormat: 1003
};

export function parseFrame(
  user: string,
  buffer: Buffer
): { data?: string; end?: number } {
  const firstByte = buffer.readUInt8(0);
  const FIN = Boolean((firstByte >>> 7) & 0x1);
  const RSV1 = Boolean((firstByte >>> 6) & 0x1);
  const RSV2 = Boolean((firstByte >>> 5) & 0x1);
  const RSV3 = Boolean((firstByte >>> 4) & 0x1);
  const OPCODE = firstByte & 0xf;

  // MUST fail connection if true, because no extensions negotiated
  if (RSV1 || RSV2 || RSV3) {
    return {
      end: CloseCodes.policyViolation
    };
  }

  let data: string;
  let end: number;
  let continuation = false;

  // first check if received control frame
  switch (OPCODE.toString()) {
    case "0": {
      // continuation
      continuation = true;
      break;
    }
    case "1": {
      // text
      break;
    }
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7": {
      end = CloseCodes.wrongFrameFormat;
      break;
    }
    case "8": {
      // close
      end = CloseCodes.normalClose;
      break;
    }
    case "9": {
      // ping
      return {};
    }
    case "10": {
      // pong
      return {};
    }
    default: {
      // if received other controle code - close connection
      end = CloseCodes.policyViolation;
      break;
    }
  }

  if (end) {
    return { end };
  }

  const secondByte = buffer.readUInt8(1);
  const MASK = Boolean((secondByte >>> 7) & 0x1);
  // keep track of our current position in the buffer
  let currentOffset = 2; // in bytes
  let payloadLength = secondByte & 0x7f;
  if (payloadLength > 125) {
    if (payloadLength === 126) {
      // if length is 126, read next 2 bytes, to get the actual length
      payloadLength = buffer.readUInt16BE(currentOffset);
      currentOffset += 2;
    } else if (payloadLength === 127) {
      // currently not supported, this means message length is over 65534
      return {
        end: CloseCodes.messageTooLarge
      };
    }
  }
  const MASKINGKEY = MASK && buffer.readUInt32BE(currentOffset);
  if (MASK) {
    currentOffset += 4;
  }
  // allocate somewhere to store the final message data
  const bufferData = Buffer.alloc(payloadLength);
  // only unmask the data if the masking bit was set to 1
  if (MASK) {
    // loop through the source buffer one byte at a time, keeping track of which
    // byte in the masking key to use in the next XOR calculation
    for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
      // extract the correct byte mask from the masking key
      const shift = j === 3 ? 0 : (3 - j) << 3;
      const mask = (shift === 0 ? MASKINGKEY : MASKINGKEY >>> shift) & 0xff;
      // read a byte from the source buffer
      const source = buffer.readUInt8(currentOffset++);
      // XOR the source byte and write the result to the data buffer
      bufferData.writeUInt8(mask ^ source, i);
    }
  } else {
    // Not masked - we can just read the data as-is
    buffer.copy(bufferData, 0, currentOffset);
  }
  const stringValue = bufferData.toString("utf8");

  let updatedValue = stringValue;
  if (continuation) {
    updatedValue = FrameStorage.get(user) + updatedValue;
  }
  FrameStorage.set(user, updatedValue);

  if (FIN) {
    try {
      const receivedData = JSON.parse(FrameStorage.get(user));
      FrameStorage.delete(user);
      if (typeof receivedData !== "string") {
        // invalid content
        data = '(invalid message type)';
      } else {
        data = receivedData.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
      }
    } catch (err) {
      end = CloseCodes.wrongDataFormat;
    }
  }

  return {
    data,
    end
  };
}
