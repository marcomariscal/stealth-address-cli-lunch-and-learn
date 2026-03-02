export type HexString = `0x${string}`;
export type EthAddress = `0x${string}`;

export const SCHEME_ID = 1n;

export interface StealthMetaAddress {
  spendingPublicKey: HexString;
  viewingPublicKey: HexString;
}

export interface StealthKeys {
  spendingPrivateKey: HexString;
  spendingPublicKey: HexString;
  viewingPrivateKey: HexString;
  viewingPublicKey: HexString;
  stealthMetaAddress: HexString;
}

export interface GenerateStealthAddressResult {
  stealthAddress: EthAddress;
  ephemeralPublicKey: HexString;
  viewTag: HexString;
}
