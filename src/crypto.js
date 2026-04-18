import CryptoJS from 'crypto-js';

// --- AES ---
export const encryptAES = (text, secretKey, options = {}) => {
  const { aesKeySize = 256, aesMode = 'CBC' } = options;
  const modeMap = {
    CBC: CryptoJS.mode.CBC,
    ECB: CryptoJS.mode.ECB,
    CTR: CryptoJS.mode.CTR
  };

  const keyLen = aesKeySize / 32;
  const hash = CryptoJS.SHA256(secretKey);
  const key = CryptoJS.lib.WordArray.create(hash.words.slice(0, keyLen));
  const iv = CryptoJS.lib.WordArray.create(CryptoJS.SHA256(secretKey + "IV").words.slice(0, 4));

  const cipherParams = {
    mode: modeMap[aesMode] || CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    iv: modeMap[aesMode] === 'ECB' ? undefined : iv
  };

  return CryptoJS.AES.encrypt(text, key, cipherParams).toString();
};

export const decryptAES = (ciphertext, secretKey, options = {}) => {
  const { aesKeySize = 256, aesMode = 'CBC' } = options;
  const modeMap = {
    CBC: CryptoJS.mode.CBC,
    ECB: CryptoJS.mode.ECB,
    CTR: CryptoJS.mode.CTR
  };

  const keyLen = aesKeySize / 32;
  const hash = CryptoJS.SHA256(secretKey);
  const key = CryptoJS.lib.WordArray.create(hash.words.slice(0, keyLen));
  const iv = CryptoJS.lib.WordArray.create(CryptoJS.SHA256(secretKey + "IV").words.slice(0, 4));

  const cipherParams = {
    mode: modeMap[aesMode] || CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    iv: modeMap[aesMode] === 'ECB' ? undefined : iv
  };

  const bytes = CryptoJS.AES.decrypt(ciphertext, key, cipherParams);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  if (!originalText) throw new Error('Dữ liệu vỡ nát. Khả năng cao do sai Key, sai Mode hoặc sai Key Size.');
  return originalText;
};

// --- DES ---
export const encryptDES = (text, secretKey) => {
  return CryptoJS.DES.encrypt(text, secretKey).toString();
};

export const decryptDES = (ciphertext, secretKey) => {
  const bytes = CryptoJS.DES.decrypt(ciphertext, secretKey);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  if (!originalText) throw new Error('Key không khớp hoặc dữ liệu bị hỏng.');
  return originalText;
};

// --- CAESAR CIPHER ---
// Chuyển ký tự theo ASCII. Hỗ trợ tất cả ký tự ASCII cơ bản.
export const encryptCaesar = (text, shiftStr) => {
  const shift = parseInt(shiftStr) || 3;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) + shift);
  }
  return btoa(unescape(encodeURIComponent(result))); // Mã hóa base64 phụ thêm cho gọn kết quả hiển thị
};

export const decryptCaesar = (ciphertext, shiftStr) => {
  try {
    const shift = parseInt(shiftStr) || 3;
    const decoded = decodeURIComponent(escape(atob(ciphertext)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) - shift);
    }
    return result;
  } catch (error) {
    throw new Error('Đầu vào không hợp lệ hoặc không phải được mã hóa bằng Caesar + Base64.');
  }
};

// --- CAESAR BRUTE FORCE ---
export const bruteForceCaesar = (ciphertext) => {
  try {
    const decoded = decodeURIComponent(escape(atob(ciphertext)));
    const results = [];
    const commonChars = [' ', 'e', 't', 'a', 'o', 'n', 'i', 's', 'h', 'r', 'l', 'u', 'm', 'c', 'v', 'y', 'p', 'd', 'g', 'b'];
    
    for (let shift = 1; shift <= 100; shift++) {
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) - shift);
      }
      
      let score = 0;
      for (let char of result.toLowerCase()) {
        if (commonChars.includes(char)) {
          score += 1;
        }
        if (char === ' ') {
          score += 3; // Space heavily indicates words
        }
      }
      
      results.push({ shift, text: result, score });
    }
    
    // Sort descending by score to surface the most readable plaintext
    results.sort((a, b) => b.score - a.score);
    return results;
  } catch (error) {
    throw new Error('Chuỗi không hợp lệ. Phải là văn bản được mã hóa bằng thuật toán Caesar của hệ thống.');
  }
};

// --- MAIN WRAPPERS ---
export const encryptText = (algo, text, secretKey, options = {}) => {
  if (!text || !secretKey) return '';
  try {
    switch (algo) {
      case 'AES': return encryptAES(text, secretKey, options);
      case 'DES': return encryptDES(text, secretKey);
      case 'CAESAR': return encryptCaesar(text, secretKey);
      default: return '';
    }
  } catch (error) {
    return '';
  }
};

export const decryptText = (algo, ciphertext, secretKey, options = {}) => {
  if (!ciphertext || !secretKey) return '';
  switch (algo) {
    case 'AES': return decryptAES(ciphertext, secretKey, options);
    case 'DES': return decryptDES(ciphertext, secretKey);
    case 'CAESAR': return decryptCaesar(ciphertext, secretKey);
    default: return '';
  }
};
