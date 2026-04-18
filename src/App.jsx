import { useState, useRef } from 'react';
import { Lock, Unlock, Copy, KeyRound, AlertCircle, FileText, Cpu, BookOpen, Terminal, ArrowDown, Database, Key, ShieldAlert, Star } from 'lucide-react';
import { encryptText, decryptText, bruteForceCaesar } from './crypto';
import './index.css';

const algorithmTheories = {
  AES: {
    name: "Advanced Encryption Standard (AES) / Rijndael",
    desc: "Được Viện Tiêu chuẩn và Công nghệ Quốc gia Hoa Kỳ (NIST) công bố vào năm 2001. Đây là thuật toán mã hóa đối xứng phân khối (Symmetric-key block cipher) thuộc mạng SPN (Substitution-Permutation Network). Không giống như DES dùng mạng Feistel, AES thực hiện toàn bộ các phép xử lý song song trên một ma trận trạng thái (State array).",
    details: [
      "Kích thước khối (Block Size): Cố định ở mức 128-bit.",
      "Kích thước khóa (Key Size): Hỗ trợ 128, 192, hoặc 256-bit.",
      "Số vòng lặp (Rounds): 10 vòng (khóa 128), 12 vòng (khóa 192), hoặc 14 vòng (khóa 256).",
      "Kỹ thuật lõi SPN: SubBytes (Khối thế phi tuyến S-Box dựa trên GF(2^8)), ShiftRows (Dịch hàng tuyến tính), MixColumns (Trộn cột bằng ma trận MDS), AddRoundKey (XOR ma trận với Round Key).",
      "Quá trình giải mã: Sử dụng các hàm nghịch đảo InvSubBytes, InvShiftRows, InvMixColumns. Khóa vòng (Round keys) được áp dụng theo trình tự ngược lại."
    ]
  },
  DES: {
    name: "Data Encryption Standard (DES)",
    desc: "Phát triển bởi IBM (dựa trên thuật toán Lucifer) và được NSA áp dụng làm tiêu chuẩn liên bang Hoa Kỳ (FIPS) vào 1977. Là nền tảng mở đường cho mật mã học hiện đại nhưng nay đã lỗi thời do khóa quá ngắn (có thể bị bẻ bằng máy tính hiện đại).",
    details: [
      "Kích thước khối (Block Size): 64-bit.",
      "Chiều dài khóa (Key Length): 56-bit hoạt động chức năng (chọn từ khóa gốc 64-bit, 8-bit dùng làm kiểm tra chẵn lẻ Parity check).",
      "Kỹ thuật lõi: Mạng Feistel (Feistel Network) chia khối dữ liệu làm đôi: Nửa trái (L) và Nửa phải (R).",
      "Số vòng lặp (Rounds): 16 vòng lặp tiêu chuẩn.",
      "Đặc tính: Quá trình mã hóa và giải mã gần như giống hệt nhau về thuật toán (chỉ cần đảo ngược thứ tự các khóa con Subkeys từ 16 về 1)."
    ]
  },
  CAESAR: {
    name: "Mã hóa Caesar (Caesar Cipher / Shift Cipher)",
    desc: "Một trong những kỹ thuật mã hóa thay thế đơn giản và lâu đời nhất, được đặt theo tên của Julius Caesar thời La Mã. Cơ chế là thay thế mỗi ký tự trong bản rõ bằng một ký tự cách nó một khoảng n nhất định trong bảng chữ cái.",
    details: [
      "Biểu diễn toán học (Mã hóa): E_n(x) = (x + n) mod 26.",
      "Biểu diễn toán học (Giải mã): D_n(x) = (x - n) mod 26.",
      "Không gian khóa (Key Space): Rất nhỏ, chỉ có 25 khóa có khả năng (đối với bảng chữ cái tiếng Anh 26 chữ).",
      "Điểm yếu rủi ro: Cực kỳ dễ bị bẻ khóa (Tấn công Brute Force duyệt toàn bộ 25 trường hợp, hoặc dùng Tấn công phân tích tần suất - Frequency Analysis)."
    ]
  }
};

function App() {
  const [algo, setAlgo] = useState('AES');
  const [text, setText] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  
  // Traces will hold array of steps: { step, title, desc }
  const [traces, setTraces] = useState([]);
  const [cryptoMode, setCryptoMode] = useState('encrypt');
  const [bruteResults, setBruteResults] = useState([]);

  const generateTrace = (type, inputLength, originalKey) => {
    let traceSteps = [];
    traceSteps.push({ step: 1, title: "1. Input Initialization", desc: `Nhận chuỗi kí tự độ dài ${inputLength}.` });
    
    if (algo === 'CAESAR') {
      const shift = parseInt(originalKey) || 3;
      traceSteps.push({ 
        step: 2, 
        title: "2. ASCII Shift", 
        desc: type === 'encrypt' ? `Cộng mã ASCII của từng ký tự thêm ${shift} bậc.` : `Trừ mã ASCII đi ${shift} bậc.` 
      });
      traceSteps.push({ 
        step: 3, 
        title: "3. Base64 Conversion", 
        desc: type === 'encrypt' ? `Gói kết quả thành định dạng Base64.` : `Tháo dỡ định dạng Base64 trước khi lùi bậc ASCII.` 
      });
    } 
    else if (algo === 'AES') {
      traceSteps.push({ 
        step: 2, 
        title: "2. Key Expansion", 
        desc: "Băm hoặc đệm Secret Key để đạt độ chuẩn cấp phát (128/256-bit). Tạo Initial Vector." 
      });
      traceSteps.push({ 
        step: 3, 
        title: type === 'encrypt' ? "3. Block Splitting & Padding (PKCS7)" : "3. Ciphertext Splitting", 
        desc: type === 'encrypt' 
          ? "Chuỗi văn bản được đệm bổ sung và chặt thành các khối dữ liệu 128-bit kích thước đều nhau." 
          : "Chuỗi Ciphertext được phân rã ngược lại thành các khối 128-bit để chuẩn bị giải mã."
      });
      traceSteps.push({ 
        step: 4, 
        title: type === 'encrypt' ? `4. Encryption Rounds Execution` : `4. Decryption Rounds (Inverse)`, 
        desc: type === 'encrypt' 
          ? `Chạy các vòng lặp (Rounds) bằng các phép toán: SubBytes -> ShiftRows -> MixColumns -> AddRoundKey.` 
          : `Thực thi vòng lặp nghịch đảo: InvShiftRows -> InvSubBytes -> AddRoundKey -> InvMixColumns.`
      });
    }
    else if (algo === 'DES') {
      traceSteps.push({ 
        step: 2, 
        title: "2. Key Schedule", 
        desc: "Rút trích 56-bit có hiệu lực từ khóa gốc để tạo 16 khóa con (Subkeys) cho 16 vòng lặp." 
      });
      traceSteps.push({ 
        step: 3, 
        title: type === 'encrypt' ? "3. Feistel Network (Encryption)" : "3. Feistel Network (Decryption)", 
        desc: type === 'encrypt'
          ? "Chuỗi được chia khối 64-bit. Mỗi khối cắt làm 2 nửa L/R, liên tục đan chéo và XOR với khóa con."
          : "Đưa dữ liệu mã hóa qua mạng Feistel, thay vì chạy chiều xuôi thì áp dụng Subkeys theo trình tự đảo ngược (Reverse Order)."
      });
    }

    traceSteps.push({ 
      step: traceSteps.length + 1, 
      title: `${traceSteps.length + 1}. Output Generation`, 
      desc: "Sinh ra chuỗi Ciphertext/Plaintext trả về giao diện." 
    });

    return traceSteps;
  };

  const processCrypto = (type) => {
    setError('');
    setTraces([]);
    setBruteResults([]);
    setCryptoMode(type);
    
    // Brute force bypasses key requirements
    if (type === 'bruteforce') {
      if (algo !== 'CAESAR') return;
      if (!text) { setError('Vui lòng nhập Ciphertext cần phá mã vào ô Văn bản.'); return; }
      try {
        const outList = bruteForceCaesar(text);
        setBruteResults(outList);
        setResult(''); // Clear single result
        
        setTraces([
          { step: 1, title: "1. Detect Target", desc: "Xác định chuỗi Ciphertext ở chế độ Brute Force." },
          { step: 2, title: "2. Base64 Decode", desc: "Tháo dỡ định dạng Base64 để thu về dải ký tự gốc." },
          { step: 3, title: "3. Linear Scan & Frequency Analysis", desc: "Dò liên tiếp vòng lặp 1 đến 100 bằng phép trừ ASCII. Đếm tần suất chữ cái (a, e, i...) và khoảng trắng liên tục." },
          { step: 4, title: "4. Output & Highlight", desc: "Sắp xếp theo Điểm ngôn ngữ. Trả về bảng quét toàn diện để mắt người dễ bề rà soát nhất." }
        ]);
      } catch(err) {
        setError(err.message);
      }
      return;
    }

    if (!text || !secretKey) {
      setError(`Vui lòng nhập văn bản và Secret Key để chạy thuật toán.`);
      return;
    }

    if (algo === 'CAESAR' && isNaN(Number(secretKey))) {
      setError('Caesar Cipher yêu cầu Secret Key phải là một con số nguyên (ví dụ: 3, 5, 7).');
      return;
    }

    try {
      let out = '';
      if (type === 'encrypt') {
        out = encryptText(algo, text, secretKey);
      } else {
        out = decryptText(algo, text, secretKey);
      }
      setResult(out);
      
      // Delay render logic steps for a sequential timeline feel
      const constructedTraces = generateTrace(type, text.length, secretKey);
      setTraces(constructedTraces);

    } catch (err) {
      setError(err.message);
      setResult('');
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      alert('Đã copy vào clipboard!');
    }
  };

  const curTheory = algorithmTheories[algo];

  const renderDiagram = () => {
    if (traces.length === 0) return null; // Only show after execution
    
    // Explicit flow type from state
    const isDecrypt = cryptoMode === 'decrypt';

    if (algo === 'AES') {
      return (
        <div className="diagram-container">
          <div className="diagram-node input"><Database size={16}/> {isDecrypt ? 'Ciphertext (128-bit)' : 'Plaintext (128-bit)'}</div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-row">
            <div className="diagram-node process">AddRoundKey</div>
            <div className="diagram-node key-node"><Key size={14}/> Round Key 0</div>
          </div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-node highlight">
            <strong>{isDecrypt ? '10 Decryption Rounds' : '10 Encryption Rounds'}</strong><br/>
            {isDecrypt ? 'InvShiftRows → InvSubBytes → AddRoundKey → InvMixColumns' : 'SubBytes → ShiftRows → MixColumns → AddRoundKey'}
          </div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-node output"><Database size={16}/> {isDecrypt ? 'Plaintext (Output)' : 'Ciphertext (Output)'}</div>
        </div>
      );
    }
    if (algo === 'DES') {
      return (
        <div className="diagram-container">
          <div className="diagram-node input"><Database size={16}/> {isDecrypt ? 'Ciphertext (64-bit)' : 'Plaintext (64-bit)'}</div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-node process">Initial Permutation (IP)</div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-row">
            <div className="diagram-node highlight">
              <strong>16 Feistel Rounds</strong><br/>
              L(n) = R(n-1) <br/>
              R(n) = L(n-1) ⊕ F(R(n-1), Subkey)
            </div>
            <div className="diagram-node key-node"><Key size={14}/> {isDecrypt ? 'Reverse Subkeys' : '16 Subkeys'}</div>
          </div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-node output"><Database size={16}/> {isDecrypt ? 'Plaintext (Output)' : 'Ciphertext (Output)'}</div>
        </div>
      );
    }
    if (algo === 'CAESAR') {
      const shift = isDecrypt ? '-k' : '+k';
      return (
        <div className="diagram-container">
          <div className="diagram-node input">A B C D E ...</div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-node highlight">
            <strong>Shift Operation</strong><br/>
            ASCII Char {shift}
          </div>
          <ArrowDown className="diagram-arrow" size={20}/>
          <div className="diagram-node output">X Y Z A B ...</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-container">
      <div className="glass-card">
        
        {/* PANEL LEFT: FORM */}
        <section className="column-left">
          <header className="header">
            <h1>Control Panel</h1>
            <p className="subtitle">Nhập liệu và thao tác vận hành</p>
          </header>

          <main className="content">
            <div className="input-group">
              <label><Cpu size={16} /> Thuật toán (Algorithm)</label>
              <select value={algo} onChange={(e) => {setAlgo(e.target.value); setTraces([]); setResult('');}}>
                <option value="AES">Advanced Encryption Standard (AES)</option>
                <option value="DES">Data Encryption Standard (DES)</option>
                <option value="CAESAR">Caesar Cipher (Mã hóa thay thế)</option>
              </select>
            </div>

            <div className="input-group">
              <label>
                <KeyRound size={16} />
                Secret Key {algo === 'CAESAR' ? '(Requires an Integer)' : ''}
              </label>
              <input
                type={algo === 'CAESAR' ? 'number' : 'password'}
                placeholder={algo === 'CAESAR' ? 'e.g. 3' : 'Enter Secret Key...'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>
                <FileText size={16} />
                Văn bản (Plaintext / Ciphertext)
              </label>
              <textarea
                placeholder="Nhập chuỗi cần xử lý..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="action-buttons">
              <button className="btn btn-encrypt" onClick={() => processCrypto('encrypt')}>
                <Lock size={18} /> Mã hóa
              </button>
              <button className="btn btn-decrypt" onClick={() => processCrypto('decrypt')}>
                <Unlock size={18} /> Giải mã
              </button>
              {algo === 'CAESAR' && (
                <button className="btn" style={{backgroundColor: '#f59e0b'}} onClick={() => processCrypto('bruteforce')}>
                  <ShieldAlert size={18} /> Phá mã
                </button>
              )}
            </div>

            <div className="result-group">
              <div className="result-header">
                <label>Kết quả (Output):</label>
                {cryptoMode !== 'bruteforce' && (
                  <button className="btn-copy" onClick={handleCopy} title="Copy kết quả">
                    <Copy size={16} />
                  </button>
                )}
              </div>
              
              {cryptoMode === 'bruteforce' && bruteResults.length > 0 ? (
                <div className="brute-force-list">
                  {bruteResults.map((r, idx) => (
                    <div key={idx} className={`brute-item ${idx === 0 ? 'highlight-bingo' : ''}`}>
                      <div className="brute-key">Shift -{r.shift} {idx === 0 && <Star size={14} color="#fcd34d" />}</div>
                      <div className="brute-text">{r.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  className="result-box"
                  readOnly
                  value={result}
                  placeholder="Khung kết quả..."
                  rows={4}
                />
              )}
            </div>
          </main>
        </section>

        {/* PANEL RIGHT: THEORY & TRACE */}
        <section className="column-right">
          <h2 className="section-title"><BookOpen size={18} /> Algorithm Theory</h2>
          <div className="algo-theory">
            <h3>{curTheory.name}</h3>
            <p>{curTheory.desc}</p>
            <ul>
              {curTheory.details.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>

          <h2 className="section-title"><Terminal size={18} /> Execution Trace</h2>
          
          {traces.length > 0 && (
            <div className="diagram-wrapper">
              {renderDiagram()}
            </div>
          )}

          <div className="trace-container">
            {traces.length === 0 ? (
              <p style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>Bấm Mã hóa hoặc Giải mã để xem luồng dữ liệu phân tích ở đây.</p>
            ) : (
              traces.map((t, index) => (
                <div className="trace-item" key={index} style={{ animationDelay: `${index * 0.2}s` }}>
                  <div className="trace-icon">{t.step}</div>
                  <div className="trace-content">
                    <div className="trace-title">{t.title}</div>
                    <div className="trace-desc">{t.desc}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

export default App;
