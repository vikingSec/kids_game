import type { Connection } from './Connection';

interface PeerConnection {
  connection: RTCPeerConnection;
  remoteStream: MediaStream | null;
  audioElement: HTMLAudioElement;
}

export class VoiceChat {
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private networkConnection: Connection;
  private enabled: boolean = false;
  private myId: string = '';

  // ICE servers for NAT traversal (using public STUN servers)
  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor(connection: Connection) {
    this.networkConnection = connection;
  }

  setMyId(id: string): void {
    this.myId = id;
  }

  async enable(): Promise<boolean> {
    if (this.enabled) return true;

    try {
      // Request microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.enabled = true;
      console.log('[VoiceChat] Microphone enabled');
      return true;
    } catch (err) {
      console.error('[VoiceChat] Failed to get microphone:', err);
      return false;
    }
  }

  disable(): void {
    if (!this.enabled) return;

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peers.forEach((peer, id) => {
      this.closePeer(id);
    });
    this.peers.clear();

    this.enabled = false;
    console.log('[VoiceChat] Disabled');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Called when a new player joins - initiate connection to them
  async connectToPeer(peerId: string): Promise<void> {
    if (!this.enabled || !this.localStream) return;
    if (this.peers.has(peerId)) return;

    console.log(`[VoiceChat] Connecting to peer ${peerId}`);

    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;

    const peer: PeerConnection = {
      connection: peerConnection,
      remoteStream: null,
      audioElement,
    };
    this.peers.set(peerId, peer);

    // Add local tracks to the connection
    this.localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, this.localStream!);
    });

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`[VoiceChat] Received track from ${peerId}`);
      peer.remoteStream = event.streams[0];
      audioElement.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.networkConnection.sendRTCIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    // Create and send offer
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      this.networkConnection.sendRTCOffer(peerId, offer);
    } catch (err) {
      console.error(`[VoiceChat] Failed to create offer for ${peerId}:`, err);
    }
  }

  // Called when we receive an offer from another peer
  async handleOffer(fromId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.enabled || !this.localStream) return;

    console.log(`[VoiceChat] Received offer from ${fromId}`);

    // If we already have a connection, close it
    if (this.peers.has(fromId)) {
      this.closePeer(fromId);
    }

    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;

    const peer: PeerConnection = {
      connection: peerConnection,
      remoteStream: null,
      audioElement,
    };
    this.peers.set(fromId, peer);

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, this.localStream!);
    });

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`[VoiceChat] Received track from ${fromId}`);
      peer.remoteStream = event.streams[0];
      audioElement.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.networkConnection.sendRTCIceCandidate(fromId, event.candidate.toJSON());
      }
    };

    // Set remote description and create answer
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      this.networkConnection.sendRTCAnswer(fromId, answer);
    } catch (err) {
      console.error(`[VoiceChat] Failed to handle offer from ${fromId}:`, err);
    }
  }

  // Called when we receive an answer to our offer
  async handleAnswer(fromId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(fromId);
    if (!peer) return;

    console.log(`[VoiceChat] Received answer from ${fromId}`);

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error(`[VoiceChat] Failed to set answer from ${fromId}:`, err);
    }
  }

  // Called when we receive an ICE candidate
  async handleIceCandidate(fromId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(fromId);
    if (!peer) return;

    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error(`[VoiceChat] Failed to add ICE candidate from ${fromId}:`, err);
    }
  }

  // Called when a player leaves
  disconnectPeer(peerId: string): void {
    this.closePeer(peerId);
    this.peers.delete(peerId);
  }

  private closePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      if (peer.audioElement.srcObject) {
        peer.audioElement.srcObject = null;
      }
      console.log(`[VoiceChat] Disconnected from ${peerId}`);
    }
  }

  dispose(): void {
    this.disable();
  }
}
