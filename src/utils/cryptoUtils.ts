// src/utils/cryptoUtils.ts
import * as Crypto from 'expo-crypto';

/**
 * 
 * Generates a random nonce string of the specified length. 
 *  
 */
export function generateNonce(length: number = 32): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const result = [];

  const randomBytes = Crypto.getRandomBytes(length);
  for (let i = 0; i < length; i++) {
    result.push(charset[randomBytes[i] % charset.length]);
  }

  return result.join('');
}

/**
 * 
 * Returns the SHA256 hash of the input string in hex format. 
 * 
 */

export async function sha256(input: string): Promise<string> {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}
