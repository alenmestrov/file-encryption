import { useEffect, useState } from 'react';
import './App.css';
import { login } from './assets/near/utils';
import styled from 'styled-components';
import nacl from 'tweetnacl';
import loginLogo from './assets/images/my-near-wallet-icon.png';


const AppWrapper = styled.div`
  background-color: #282c34;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;


  .login-wrap {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .login-logo {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .login-btn {
      color: #FFF;
      font-family: Open Sans;
      font-size: 14px;
      font-style: normal;
      font-weight: 600;
      line-height: 155%;
      margin-top: 8px;
    }
  }

  .actions-wrap {
    display: flex;

    .upload-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 16px;

      &.chunk-section {
        margin-right: 16px;
      }

      .section-title {
        margin: 0 auto;
        margin-bottom: 16px;
      }
  
      input, a {
        margin-bottom: 24px;
        color: #FFF;

        &::file-selector-button {
          margin-right: 20px;
          border: none;
          background: #00C08B;
          padding: 10px 20px;
          border-radius: 10px;
          color: #fff;
          cursor: pointer;
          transition: background .2s ease-in-out;
        }
      }

      p {
        margin-bottom: 16px;
      }
    }
  }
  

  h1, p {
    color: #FFF;
    font-family: Open Sans;
    font-size: 14px;
    font-style: normal;
    font-weight: 600;
    line-height: 155%;
    margin-top: 8px;
  }

  h1 {
    font-size: 24px;
  }

  .account-name {
    margin-bottom: 16px;
  }
`;

function App() {

  const [myUsername, setMyUsername] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [timeChunk, setTimeChunk] = useState(0);
  const [timeNormal, setTimeNormal] = useState(0);

  const [nonce, setNonce] = useState(null);
  const [key, setKey] = useState(null);

  const [currentNormalFile, setCurrentNormalFile] = useState(null);

  useEffect(() => {
    if(window.walletConnection && window.walletConnection.isSignedIn()) {
      setMyUsername(window.walletConnection.getAccountId());
    }
  }, []);

  useEffect(() => {
    if(currentFile) {
      encryptFileChunks(currentFile);  
    }
  }, [currentFile]);

  useEffect(() => {
    if(uploadFile) {
      decryptFile(uploadFile);
    }
  }, [uploadFile]);

  useEffect(() => {
    if(currentNormalFile) {
      encryptFileNormal(currentNormalFile);  
    }
  }, [currentNormalFile]);

  const decryptFile = async (file) => {
    const reader = new FileReader();
    const chunkSize = 5242896; //5MB
    const skipSize = 10 * 1024 * 1024; //10MB
    const combinedChunks = [];
    const totalSize = file.size;
    let offset = 0;

    reader.onload = async function(e) {
      var data = e.target.result;
      while (offset < totalSize) {
        const blob = data.slice(offset, offset + chunkSize);
        const chunk = await new Response(blob).arrayBuffer();
        const decryptedChunk = await decryptData(chunk);
        const normalChunk = data.slice((offset+chunkSize), (offset + chunkSize + skipSize));
        combinedChunks.push(decryptedChunk, new Uint8Array(normalChunk));
        offset += chunkSize + skipSize;
      }

      const combinedBlob = new Blob(combinedChunks);

      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(combinedBlob);
      downloadLink.download = 'decrypted_file.' + file.name.split('.').pop();
      downloadLink.textContent = 'Download decrypted file';
      document.querySelector('.chunk-section').appendChild(downloadLink);
    }

    reader.readAsArrayBuffer(file);
  }

  const encryptFileChunks = async (file) => {
    const reader = new FileReader();
    const chunkSize = 5 * 1024 * 1024; //5MB
    const skipSize = 10 * 1024 * 1024; //10MB
    const combinedChunks = [];
    const totalSize = file.size;
    let offset = 0;

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    setNonce(nonce);
    const key = nacl.randomBytes(nacl.secretbox.keyLength);
    setKey(key);

    reader.onload = async function(e) {
      let startTime = new Date();
      var data = e.target.result;
      while (offset < totalSize) {
        const blob = data.slice(offset, offset + chunkSize);
        const chunk = await new Response(blob).arrayBuffer();
        const encryptedChunk = await encryptChunk(chunk, nonce, key);
        const normalChunk = data.slice((offset+chunkSize), (offset + chunkSize + skipSize));
        const normalChunkBuffer = await new Response(normalChunk).arrayBuffer();
        combinedChunks.push(encryptedChunk, new Uint8Array(normalChunkBuffer));
        offset += chunkSize + skipSize;
      }
      let endTime = new Date();
      setTimeChunk(endTime - startTime);
      const combinedBlob = new Blob(combinedChunks);

      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(combinedBlob);
      downloadLink.download = 'encrypted_file.' + file.name.split('.').pop();
      downloadLink.textContent = 'Download Encrypted File';
      document.querySelector('.chunk-section').appendChild(downloadLink);
    }

    reader.readAsArrayBuffer(file);
  }

  const encryptFileNormal = async (file) => {
    const reader = new FileReader();

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const key = nacl.randomBytes(nacl.secretbox.keyLength);

    reader.onload = async function(e) {
      let startTime = new Date();
      var data = e.target.result;
     
      const encryptedFile = await encryptChunk(data, nonce, key);
     
      let endTime = new Date();
      setTimeNormal(endTime - startTime);
      const combinedBlob = new Blob(encryptedFile);

      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(combinedBlob);
      downloadLink.download = 'encrypted_file.' + file.name.split('.').pop();
      downloadLink.textContent = 'Download Encrypted File';
      document.querySelector('.chunk-section').appendChild(downloadLink);
    }

    reader.readAsArrayBuffer(file);
  }

  const encryptChunk = async (data, nonce, key) => {
    const encrypted = nacl.secretbox(new Uint8Array(data), nonce, key);
    return encrypted;
  }

  const decryptData = async (data) => {
    const decryptedData = nacl.secretbox.open(new Uint8Array(data), nonce, key);
    return decryptedData;
  }

  return (
    <AppWrapper>
      {
        myUsername ? (
          <>
            <h1>Partial file encryption Proof of concept</h1>
            <p className="account-name">Account ID: {myUsername}</p>
            <div className="actions-wrap">
              <div className="upload-wrap chunk-section">
                <p className="section-title">Chunk encryption</p>
                <p>Encrypt File:</p>
                <input type="file" className="file-upload" onChange={(event) => setCurrentFile(event.target.files[0])}/>
                <p>Decrypt File:</p>
                <input type="file" className="file-upload" onChange={(event) => setUploadFile(event.target.files[0])}/>
                <p>Time: {timeChunk} miliseconds</p>
              </div>
              <div className="upload-wrap">
                <p className="section-title">Normal encryption</p>
                <p>Encrypt File:</p>
                <input type="file" className="file-upload" onChange={(event) => setCurrentNormalFile(event.target.files[0])}/>
                <p>Decrypt File:</p>
                <input type="file" className="file-upload" onChange={(event) => setUploadFile(event.target.files[0])}/>
                <p>Time: {timeNormal} miliseconds</p>
              </div>
            </div>
          </>
        )
        :
        (
          <div className="login-wrap">
            <img src={loginLogo} className="login-logo" alt="login-logo" />
            <button href="#" className="btn-secondary" onClick={() => login()}>Login</button>
          </div>
        )
      }
    </AppWrapper>
  );
}

export default App;
