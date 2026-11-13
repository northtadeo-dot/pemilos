import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot, serverTimestamp, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAavqvbIedQ1Z87pEXkmHW5EfAOBY3meGQ",
  authDomain: "pemilos-7b400.firebaseapp.com",
  projectId: "pemilos-7b400",
  storageBucket: "pemilos-7b400.firebasestorage.app",
  messagingSenderId: "861750864119",
  appId: "1:861750864119:web:c2e4eeb830cb5e60304bf2",
  measurementId: "G-54R5957LM2"
};

// Daftar kandidat dikelompokkan sesuai kategori OSIS & MPK[cite: 1]
const candidates = [
  // KANDIDAT OSIS[cite: 1]
  {id:"teisha", category:"OSIS", name:"TESA", num:"01", photo:"SaveInta.com_901549513_18122259398283641_5517563518370535626_n.jpg", slogan:"Bersama membangun organisasi yang lebih baik."},
  {id:"anindra", category:"OSIS", name:"ANINDRA", num:"02", photo:"SaveInta.com_900799708_18122259167283641_4781494588370074698_n.jpg", slogan:"Kreatif, bertanggung jawab, dan aspiratif."},
  {id:"acintya", category:"OSIS", name:"ACINTYA", num:"03", photo:"SaveInta.com_896643637_18122259521283641_3948422317047171652_n.jpg", slogan:"Berintegritas, aktif, dan siap membawa perubahan."},

  // KANDIDAT MPK[cite: 1]
  {id:"nasywa", category:"MPK", name:"NASWA", num:"01", photo:"SaveInta.com_900543656_18122259032283641_5685371726680213311_n.jpg", slogan:"Kolaborasi untuk lingkungan sekolah yang positif."},
  {id:"riza", category:"MPK", name:"RISA", num:"02", photo:"SaveInta.com_899493565_18122258969283641_8472109624191075486_n.jpg", slogan:"Satu suara, satu tujuan, banyak perubahan."},
  {id:"rachel", category:"MPK", name:"RACHE", num:"03", photo:"SaveInta.com_903618249_18122259071283641_4919615730639561574_n.jpg", slogan:"Mendengar aspirasi dan bergerak bersama."}
];

const configured = firebaseConfig.apiKey !== "ISI_API_KEY" && firebaseConfig.projectId !== "ISI_PROJECT_ID";
const app = configured ? initializeApp(firebaseConfig) : null;
const analytics = app ? getAnalytics(app) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const root = document.querySelector("#app");
let user = null, admin = false, open = true, stopVotes = null, stopElection = null, sending = false;

function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function login(message=""){
  root.innerHTML=`<section class="login"><div class="intro"><div class="eyebrow">PEMILIHAN ORGANISASI SEKOLAH</div><h1>YOUR VOICE.<br><span>YOUR FUTURE.</span></h1><p>New Chapter of Adikara. Perubahan dimulai dari satu suara.</p><div class="stamp">SATYA<br>ADIKARA</div></div><section class="panel"><div class="eyebrow">SELAMAT DATANG</div><h2>Masuk ke akunmu</h2><p class="muted">Gunakan akun yang sudah didaftarkan panitia.</p><form id="login"><label>Email</label><input id="email" type="email" required placeholder="nama@email.com"><label>Password</label><input id="password" type="password" required placeholder="Masukkan password"><div id="error" class="error">${esc(message)}</div><button class="btn primary">MASUK SEKARANG →</button></form><small class="hint">Login pemilih dan admin melalui halaman ini.</small></section></section>`;
  document.querySelector("#login").addEventListener("submit",async e=>{
    e.preventDefault();
    const b=e.submitter;b.disabled=true;b.textContent="MEMERIKSA...";
    try{
      await signInWithEmailAndPassword(auth,document.querySelector("#email").value.trim(),document.querySelector("#password").value);
    }catch(err){
      document.querySelector("#error").textContent=err.code==="auth/invalid-credential"?"Email atau password salah.":"Gagal masuk. Periksa akun dan koneksi.";
      b.disabled=false;b.textContent="MASUK SEKARANG →";
    }
  });
}

function card(c, disabled){
  const media = c.photo 
    ? `<img src="${esc(c.photo)}" alt="${esc(c.name)}" class="candidate-img" onerror="this.outerHTML='<div class=portrait>${c.name[0]}</div>'">`
    : `<div class="portrait">${c.name[0]}</div>`;

  return `<article class="candidate">
    <div class="photo"><b>${c.category} • NO. ${c.num}</b>${media}<i class="frame"></i></div>
    <div class="candidate-info">
      <h3>${c.name}</h3>
      <p>${c.slogan}</p>
      <button class="btn choose" data-id="${c.id}" ${disabled?"disabled":""}>PILIH KANDIDAT →</button>
    </div>
  </article>`;
}

// Mengambil status sesi bilik suara saat ini dari localStorage
function getBoothState() {
  return {
    osisDone: localStorage.getItem("booth_osis_done") === "true",
    mpkDone: localStorage.getItem("booth_mpk_done") === "true",
    locked: localStorage.getItem("booth_locked") === "true"
  };
}

function voter(){
  if(!user) return;
  const state = getBoothState();

  // Jika kedua bagian sudah dipilih atau bilik dalam keadaan terkunci, tampilkan layar kode akses
  if (state.locked || (state.osisDone && state.mpkDone)) {
    showCodePromptScreen();
    return;
  }

  renderVotingInterface(state.osisDone, state.mpkDone);
}

function showCodePromptScreen(){
  root.innerHTML = `<section class="page" style="display: flex; justify-content: center; align-items: center; min-height: 80vh;">
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; max-width: 450px; width: 100%; text-align: center;">
      <div class="eyebrow" style="color: #70e8b8; margin-bottom: 10px;">PEMILIHAN SELESAI</div>
      <h2 style="margin-bottom: 15px;">Bilik Suara <span>Terkunci</span></h2>
      <p class="muted" style="margin-bottom: 25px; font-size: 14px;">Terima kasih, suara OSIS & MPK telah tersimpan. Masukkan kode panitia untuk memulai ulang web bagi pemilih berikutnya.</p>
      <form id="code-form">
        <input id="access-code" type="password" required placeholder="Masukkan kode panitia" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #fff; margin-bottom: 15px; text-align: center; font-size: 16px; letter-spacing: 2px;">
        <div id="code-error" class="error" style="margin-bottom: 15px;"></div>
        <div style="display: flex; gap: 10px;">
          <button type="button" id="btn-logout-code" class="btn ghost" style="flex: 1;">KELUAR AKUN</button>
          <button type="submit" class="btn primary" style="flex: 1;">MULAI ULANG →</button>
        </div>
      </form>
    </div>
  </section>`;

  document.querySelector("#btn-logout-code").onclick = () => signOut(auth);
  document.querySelector("#code-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = "MEMERIKSA...";

    const codeInput = document.querySelector("#access-code").value.trim();
    
    // Ambil kode dari Firestore (settings/election -> field code), default ke "2026"
    let secretCode = "2026";
    try {
      const settingDoc = await getDoc(doc(db, "settings", "election"));
      if(settingDoc.exists() && settingDoc.data().code) {
        secretCode = String(settingDoc.data().code);
      }
    } catch(err) {
      console.warn("Menggunakan kode default.");
    }

    if(codeInput === secretCode) {
      // Reset status sesi bilik suara agar pemilih baru bisa memilih OSIS & MPK dari awal
      localStorage.removeItem("booth_osis_done");
      localStorage.removeItem("booth_mpk_done");
      localStorage.removeItem("booth_locked");
      window.location.reload(); // Mulai ulang web
    } else {
      document.querySelector("#code-error").textContent = "Kode akses salah!";
      btn.disabled = false;
      btn.textContent = "MULAI ULANG →";
    }
  };
}

function renderVotingInterface(hasVotedOsis, hasVotedMpk){
  const osisList = candidates.filter(c => c.category === "OSIS");
  const mpkList = candidates.filter(c => c.category === "MPK");
  const currentCategoryStep = !hasVotedOsis ? "OSIS" : "MPK";

  root.innerHTML=`<section class="page">
    <div class="heading">
      <div>
        <div class="eyebrow">HAK SUARAMU, MASA DEPAN KITA</div>
        <h1>Waktunya <span>memilih (${currentCategoryStep}).</span></h1>
        <p>${!hasVotedOsis ? "Langkah 1 dari 2: Pilih kandidat Ketua OSIS terlebih dahulu." : "Langkah 2 dari 2: Bagian OSIS sudah selesai & terkunci. Silakan pilih kandidat Ketua MPK."}</p>
      </div>
      <button id="logout" class="btn ghost">KELUAR</button>
    </div>
    <div id="status" class="notice">
      ${!hasVotedOsis ? "Silakan pilih kandidat OSIS. Setelah memilih, Anda akan diarahkan otomatis ke pemilihan MPK." : "Bagian OSIS telah terkunci. Silakan tentukan pilihan Ketua MPK Anda."}
    </div>
    
    <div class="section-title" ${!hasVotedOsis ? "" : "style='opacity: 0.4;'"}>KANDIDAT KETUA OSIS <small>${hasVotedOsis ? "SUDAH DIPILIH (TERKUNCI)" : "3 KANDIDAT"}</small></div>
    <div class="grid" style="margin-bottom: 40px; ${!hasVotedOsis ? "" : "opacity: 0.5; pointer-events: none;"}">
      ${osisList.map(c=>card(c, !open || hasVotedOsis)).join("")}
    </div>

    <div class="section-title" ${hasVotedOsis ? "" : "style='opacity: 0.4;'"}>KANDIDAT KETUA MPK <small>${hasVotedMpk ? "SUDAH DIPILIH (TERKUNCI)" : (!hasVotedOsis ? "SELESAIKAN OSIS DULU" : "3 KANDIDAT")}</small></div>
    <div class="grid" style="${hasVotedOsis ? "" : "opacity: 0.5; pointer-events: none;"}">
      ${mpkList.map(c=>card(c, !open || !hasVotedOsis || hasVotedMpk)).join("")}
    </div>

    <p id="closed" class="error" ${open?"hidden":""}>Pemilihan sedang ditutup admin.</p>
  </section><div id="modal"></div>`;

  document.querySelector("#logout").onclick=()=>signOut(auth);
  document.querySelectorAll("[data-id]").forEach(b=>{
    b.onclick=()=>confirmVote(b.dataset.id);
  });

  if(stopElection)stopElection();
  stopElection=onSnapshot(doc(db,"settings","election"),s=>{
    open=s.exists()?s.data().open===true:true;
    document.querySelectorAll("[data-id]").forEach(b=>{
      const cid = b.dataset.id;
      const cand = candidates.find(x => x.id === cid);
      const isDisabled = !open || (cand.category === "OSIS" && hasVotedOsis) || (cand.category === "MPK" && (!hasVotedOsis || hasVotedMpk));
      b.disabled = isDisabled;
    });
    document.querySelector("#closed").hidden=open;
  });
}

function confirmVote(id){
  const c=candidates.find(x=>x.id===id);if(!c||sending)return;
  document.querySelector("#modal").innerHTML=`<div class="backdrop"><section class="dialog"><div class="eyebrow">KONFIRMASI PILIHAN (${c.category})</div><h2>Yakin memilih <span>${c.name}</span>?</h2><p>Nomor Urut ${c.num} — Kandidat ${c.category}. Suara akan langsung dicatat ke sistem dan tidak dapat diubah.</p><div class="actions"><button id="cancel" class="btn ghost">BATAL</button><button id="send" class="btn primary">YA, KIRIM SUARA</button></div></section></div>`;
  document.querySelector("#cancel").onclick=()=>document.querySelector("#modal").innerHTML="";
  document.querySelector("#send").onclick=()=>castVote(id, c.category);
}

async function castVote(id, category){
  if(sending||!user)return;
  sending=true;
  const b=document.querySelector("#send");
  b.disabled=true;
  b.textContent="MENGIRIM...";
  try{
    // Simpan suara baru ke Firestore
    await addDoc(collection(db,"votes"),{
      uid: user.uid,
      candidateId: id,
      category: category,
      createdAt: serverTimestamp()
    });

    // Tandai tahap pemilihan di sesi bilik suara saat ini
    if (category === "OSIS") {
      localStorage.setItem("booth_osis_done", "true");
    } else if (category === "MPK") {
      localStorage.setItem("booth_mpk_done", "true");
      localStorage.setItem("booth_locked", "true"); // Kunci bilik setelah MPK selesai
    }
    
    document.querySelector("#modal").innerHTML=`<div class="backdrop"><section class="dialog success"><div class="check">✓</div><div class="eyebrow">SUARA BERHASIL DIKIRIM</div><h2>Terima kasih sudah <span>memilih ${category}!</span></h2><p>${category === "OSIS" ? "Melanjutkan ke pemilihan MPK..." : "Memuat ulang web..."}</p></section></div>`;
    
    setTimeout(() => {
      if (category === "MPK") {
        // Mulai ulang web setelah selesai memilih OSIS & MPK
        window.location.reload();
      } else {
        // Lanjut langsung ke MPK tanpa reload penuh agar mulus
        document.querySelector("#modal").innerHTML="";
        voter();
      }
    }, 1000);
  }catch(err){
    console.error(err);
    document.querySelector("#modal").innerHTML=`<div class="backdrop"><section class="dialog"><h2>Suara belum terkirim</h2><p>${err.code==="permission-denied"?"Pemilihan sedang ditutup atau aturan akses ditolak.":"Periksa koneksi internet lalu coba lagi."}</p><button id="close" class="btn primary">TUTUP</button></section></div>`;
    document.querySelector("#close").onclick=()=>document.querySelector("#modal").innerHTML="";
  }finally{
    sending=false;
  }
}

function dashboard(){
  root.innerHTML=`<section class="page">
    <div class="heading">
      <div><div class="eyebrow">PUSAT KENDALI PEMILIHAN</div><h1>Admin <span>dashboard.</span></h1><p>Pantau perolehan suara yang masuk secara langsung.</p></div>
      <button id="logout" class="btn ghost">KELUAR</button>
    </div>
    <div class="toolbar">
      <div><i class="live"></i><b>LIVE MONITORING</b><small id="live">Menghubungkan database...</small></div>
      <div style="display: flex; gap: 10px;">
        <button id="reset-votes" class="btn danger" style="background: #b83232;">RESET SUARA</button>
        <button id="toggle" class="btn danger">...</button>
      </div>
    </div>
    <div class="stats">
      <article><small>TOTAL SUARA MASUK</small><strong id="total">—</strong></article>
      <article><small>KANDIDAT</small><strong>06</strong></article>
      <article><small>STATUS PEMILIHAN</small><strong id="state">—</strong></article>
    </div>
    <div class="section-title">PEROLEHAN SUARA <small>REALTIME</small></div>
    <div id="results" class="results">Memuat data...</div>
    <p class="muted">Dashboard menampilkan hasil agregat, bukan identitas pemilih beserta pilihannya.</p>
  </section><div id="modal"></div>`;

  document.querySelector("#logout").onclick=()=>signOut(auth);
  
  document.querySelector("#toggle").onclick=async()=>{
    try{
      await setDoc(doc(db,"settings","election"),{open:!open,updatedAt:serverTimestamp()},{merge:true});
    }catch(e){
      alert("Gagal mengubah status.");
    }
  };

  document.querySelector("#reset-votes").onclick=()=>{
    document.querySelector("#modal").innerHTML=`<div class="backdrop"><section class="dialog">
      <div class="eyebrow" style="color: #ff5b8a;">PERINGATAN BERBAHAYA</div>
      <h2>Reset seluruh <span>suara?</span></h2>
      <p>Semua data pilihan yang sudah masuk akan dihapus permanen dan tidak dapat dikembalikan.</p>
      <div class="actions">
        <button id="cancel-reset" class="btn ghost">BATAL</button>
        <button id="confirm-reset" class="btn danger" style="background: #b83232;">YA, HAPUS SEMUA</button>
      </div>
    </section></div>`;
    
    document.querySelector("#cancel-reset").onclick=()=>document.querySelector("#modal").innerHTML="";
    document.querySelector("#confirm-reset").onclick=async()=>{
      const btnReset = document.querySelector("#confirm-reset");
      btnReset.disabled = true;
      btnReset.textContent = "MENGHAPUS...";
      try {
        const querySnapshot = await getDocs(collection(db, "votes"));
        const deletePromises = querySnapshot.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        
        document.querySelector("#modal").innerHTML=`<div class="backdrop"><section class="dialog success">
          <div class="check">✓</div>
          <div class="eyebrow">BERHASIL DIRESET</div>
          <h2>Data suara <span>dikosongkan!</span></h2>
          <p>Semua perolehan suara berhasil dihapus dari database.</p>
          <button id="close-modal" class="btn primary">TUTUP</button>
        </section></div>`;
        document.querySelector("#close-modal").onclick=()=>document.querySelector("#modal").innerHTML="";
      } catch (err) {
        console.error(err);
        alert("Gagal mereset suara.");
        document.querySelector("#modal").innerHTML="";
      }
    };
  };

  if(stopElection)stopElection();
  stopElection=onSnapshot(doc(db,"settings","election"),s=>{
    open=s.exists()?s.data().open===true:true;
    const b=document.querySelector("#toggle"),st=document.querySelector("#state");
    if(b){
      b.textContent=open?"TUTUP PEMILIHAN":"BUKA PEMILIHAN";
      b.className="btn "+(open?"danger":"primary");
      st.textContent=open?"DIBUKA":"DITUTUP";
      st.style.color=open?"#70e8b8":"#ff9ab1";
    }
  });

  if(stopVotes)stopVotes();
  stopVotes=onSnapshot(collection(db,"votes"),s=>{
    const counts=Object.fromEntries(candidates.map(c=>[c.id,0]));
    s.forEach(v=>{if(counts[v.data().candidateId]!==undefined)counts[v.data().candidateId]++;});
    const total=s.size;
    document.querySelector("#total").textContent=total.toLocaleString("id-ID");
    document.querySelector("#live").textContent="Data diperbarui otomatis";
    document.querySelector("#results").innerHTML=candidates.map(c=>{
      const n=counts[c.id],p=total?Math.round(n/total*100):0;
      return `<div class="result"><div><b>[${c.category}] ${c.num} — ${c.name}</b><strong>${p}%</strong></div><small>${n} suara</small><div class="track"><i style="width:${p}%"></i></div></div>`;
    }).join("");
  },e=>{
    console.error(e);
    document.querySelector("#live").textContent="Gagal memuat data.";
  });
}

function setup(){
  if(!configured){root.innerHTML=`<section class="setup"><div class="eyebrow">PERSIAPAN SISTEM</div><h1>Firebase belum <span>terhubung.</span></h1><p>Isi konfigurasi Firebase di file script.js.</p></section>`;return;}
  onAuthStateChanged(auth,async u=>{if(stopVotes)stopVotes();if(stopElection)stopElection();stopVotes=stopElection=null;user=u;if(!u){login();return;}try{const token=await u.getIdTokenResult(true);admin=token.claims.admin===true;if(admin){dashboard();return;}const v=await getDoc(doc(db,"voters",u.uid));if(!v.exists()||v.data().enabled!==true){await signOut(auth);login("Akun belum diaktifkan sebagai pemilih. Hubungi panitia.");return;}voter();}catch(e){console.error(e);await signOut(auth);login("Akses gagal.");}});
}
setup();