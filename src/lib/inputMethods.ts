import type { InputMethod } from "@/store/useStore";

/** The four ways a sample comes in, offered on Home and as Studio tabs. */
export const INPUT_METHODS: { id: InputMethod; label: string; sub: string }[] = [
  { id: "type", label: "Type or paste", sub: "SALT-style lines with live counts" },
  { id: "audio", label: "Upload audio", sub: "Waveform, optional local speech-to-text draft" },
  { id: "record", label: "Record live", sub: "Saved to this browser only" },
  { id: "import", label: "Import file", sub: ".cha (CHAT) · .txt (SALT) · .json" },
];
