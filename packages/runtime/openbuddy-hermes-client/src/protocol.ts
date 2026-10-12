export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

export function assertCompatibleProtocol(protocolVersion: string): void {
  const major = Number(protocolVersion.split(".")[0]);
  if (major !== 1) {
    throw new ProtocolError(`incompatible protocol major: ${protocolVersion}`);
  }
}
