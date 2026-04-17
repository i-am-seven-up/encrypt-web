import { useState, useRef } from 'react';
import { Lock, Unlock, Copy, KeyRound, AlertCircle, FileText, Cpu, Server, BookOpen, Terminal } from 'lucide-react';
import { encryptText, decryptText } from './crypto';
import './index.css';

const algorithmTheories = {
  AES: {
    name: "Advanced Encryption Standard (AES)",
    desc: "AES là tiêu chuẩn mã hóa đối xứng phân khối được sử dụng rộng rãi và an toàn nhất hiện nay. Hỗ trợ khóa 128, 192 hoặc 256 bits.",
    details: [
      "Kích thước khối (Block size): 128 bits.",
      "Số vòng lặp (Rounds): 10, 12, hoặc 14 vòng tùy theo độ dài khóa.",
      "Kỹ thuật lõi: Ma trận trạng thái (State array) 4x4.",
      "Cấu trúc mỗi vòng: SubBytes, ShiftRows, MixColumns, AddRoundKey."
    ]
  },
  DES: {
    name: "Data Encryption Standard (DES)",
    desc: "DES là tiêu chuẩn mã hóa từ những năm 1970, tiền thân của AES. Hiện nay DES đã có thể bị phá vỡ dễ dàng bằng Brute-Force do chiều dài khóa quá ngắn.",
    details: [
      "Kích thước khối (Block size): 64 bits.",
      "Kích thước khóa (Key length): 56 bits (gần như mất an toàn).",
      "Kỹ thuật lõi: Mạng Feistel (Feistel network).",
      "Số vòng lặp (Rounds): 16 vòng."
    ]
  },
  CAESAR: {
    name: "Mã hóa dịch chuyển Caesar",
    desc: "Là kỹ thuật mã hóa thay thế lâu đời nhất. Được Julius Caesar sử dụng để gửi thông điệp bí mật. Nguyên lý dựa trên việc dịch chuyển các ký tự đi một số nguyên k.",
    details: [
      "Khóa k: Mã ASCII được cộng thêm một hằng số.",
      "Ví dụ: A(65) + 3 = D(68).",
      "Độ an toàn: Rất thấp, có thể bị phá vỡ bằng phân tích tần suất chữ cái."
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
        title: "3. Block Splitting & Padding (PKCS7)", 
        desc: "Chuỗi văn bản được đệm bổ sung và chặt thành các khối dữ liệu 128-bit kích thước đều nhau." 
      });
      traceSteps.push({ 
        step: 4, 
        title: `4. Rounds Execution`, 
        desc: `Chạy các vòng lặp (Rounds) bằng các phép toán: SubBytes -> ShiftRows -> MixColumns -> AddRoundKey.` 
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
        title: "3. Feistel Network", 
        desc: "Chuỗi được chia khối 64-bit. Mỗi khối cắt làm 2 nửa L/R, liên tục đan chéo và XOR với khóa con." 
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
            </div>

            <div className="result-group">
              <div className="result-header">
                <label>Kết quả (Output):</label>
                <button className="btn-copy" onClick={handleCopy} title="Copy kết quả">
                  <Copy size={16} />
                </button>
              </div>
              <textarea
                className="result-box"
                readOnly
                value={result}
                placeholder="Khung kết quả..."
                rows={4}
              />
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
