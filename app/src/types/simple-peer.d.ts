declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  interface SimplePeerOptions {
    initiator?: boolean;
    channelName?: string;
    config?: RTCConfiguration;
    constraints?: RTCConstraints;
    offerConstraints?: RTCOfferOptions;
    answerConstraints?: RTCAnswerOptions;
    sdpTransform?: (sdp: string) => string;
    stream?: MediaStream;
    streams?: MediaStream[];
    trickle?: boolean;
    allowHalfTrickle?: boolean;
    objectMode?: boolean;
  }

  interface SignalData {
    type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp?: string;
    candidate?: RTCIceCandidateInit;
  }

  class SimplePeer extends EventEmitter {
    constructor(options?: SimplePeerOptions);

    signal(data: SignalData): void;
    send(data: string | Buffer | ArrayBuffer | ArrayBufferView): void;
    addStream(stream: MediaStream): void;
    removeStream(stream: MediaStream): void;
    addTrack(track: MediaStreamTrack, stream: MediaStream): void;
    removeTrack(track: MediaStreamTrack, stream: MediaStream): void;
    replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack, stream: MediaStream): void;
    destroy(err?: Error): void;

    readonly connected: boolean;
    readonly destroyed: boolean;
    readonly connecting: boolean;
    readonly initiator: boolean;
    readonly channelName: string;
    readonly streams: MediaStream[];

    on(event: 'signal', listener: (data: SignalData) => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'data', listener: (data: Buffer) => void): this;
    on(event: 'stream', listener: (stream: MediaStream) => void): this;
    on(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;

    once(event: 'signal', listener: (data: SignalData) => void): this;
    once(event: 'connect', listener: () => void): this;
    once(event: 'close', listener: () => void): this;
    once(event: 'data', listener: (data: Buffer) => void): this;
    once(event: 'stream', listener: (stream: MediaStream) => void): this;
    once(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    once(event: 'error', listener: (err: Error) => void): this;
  }

  export = SimplePeer;
}
