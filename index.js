import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
	getAuth,
	signInWithPopup,
	GoogleAuthProvider,
	onAuthStateChanged,
	signOut
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
	getFirestore,
	collection,
	doc,
	getDocFromServer,
	setDoc,
	onSnapshot,
	query,
	orderBy,
	limit,
	serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

// DOM Elements
const studentSelect = document.getElementById('studentSelect');
const amountInput = document.getElementById('amountInput');
const submitButton = document.getElementById('btn');
const decreaseButton = document.getElementById('decreaseBtn');
const formMessage = document.getElementById('formMessage');
const paymentList = document.getElementById('paymentList');
const transactionList = document.getElementById('transactionList');
const totalCash = document.getElementById('totalCash');
const paidCount = document.getElementById('paidCount');
const transactionStatus = document.getElementById('transactionStatus');
const listCount = document.getElementById('listCount');
const selectedStudentName = document.getElementById('selectedStudentName');
const selectedWeek = document.getElementById('selectedWeek');
const panelHeading = document.getElementById('panelHeading');
const tabStudents = document.getElementById('tabStudents');
const tabTransactions = document.getElementById('tabTransactions');
const authBtn = document.getElementById('authBtn');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

const storageKey = 'uangKas9DStudents';

// 24 Official Students Roster of 9D
const studentNames = [
	'Athar Dean Permana',
	'Azalea Ayudia Inara',
	'Azka Ghaisan Pratama',
	'Callysta Khaira Hapsari',
	'Dan Bintang Haryana',
	'F. Nanami',
	'Farzan Hafiz Ahza Argani',
	'Gara Dapunta',
	'Hasby Habibi Ash Siddiq',
	'Hatta Yunadil Iman',
	'Kirana Kylla Triarmaghani',
	'Mezaya Kayla Izzaty',
	'Muhammad Hazzriel Azzam Wibisono',
	'Muhammad Irsyad Akbar Permana',
	'Muhammad Nadzaki Huzaifah',
	'Muhammad Revananda Utomo',
	'Naura Athaya Salsabila',
	'Riffat Zaki Arrabani',
	'Sakha Attaillah Andrian',
	'Sarrah Nur Bilqis',
	'Satriasyach Giliandra Amri',
	'Shafana Fitria Aulia Fayza',
	'Taqiyyudin Dastan Arzaq',
	'Wa Ode Rayeeza Nawra'
];

const students = studentNames.map((name, index) => ({
	id: index + 1,
	name,
	amount: 0,
	week: 0
}));

// Fallback to local cache if present (preserves balance while using official names)
const savedStudents = JSON.parse(localStorage.getItem(storageKey) || 'null');
if (Array.isArray(savedStudents)) {
	savedStudents.forEach((savedStudent) => {
		const student = students.find((item) => item.id === savedStudent.id);
		if (student) {
			student.amount = Number(savedStudent.amount) || 0;
			student.week = Math.floor(student.amount / 10000);
		}
	});
}

const formatRupiah = (amount) => `Rp ${(amount || 0).toLocaleString('id-ID')}`;

function populateStudentSelect() {
	const currentVal = studentSelect.value;
	studentSelect.innerHTML = '<option value="">Pilih salah satu siswa</option>';
	students.forEach((student) => {
		const option = document.createElement('option');
		option.value = student.id;
		option.textContent = `${String(student.id).padStart(2, '0')}. ${student.name}`;
		studentSelect.appendChild(option);
	});
	studentSelect.value = currentVal;
}

populateStudentSelect();

// Tab switching state
let currentTab = 'students'; // 'students' | 'transactions'
let transactionHistory = [];

function switchTab(tab) {
	currentTab = tab;
	if (tab === 'students') {
		tabStudents.classList.add('active');
		tabTransactions.classList.remove('active');
		paymentList.style.display = 'grid';
		transactionList.style.display = 'none';
		panelHeading.textContent = 'Rekap Kas Siswa';
	} else {
		tabStudents.classList.remove('active');
		tabTransactions.classList.add('active');
		paymentList.style.display = 'none';
		transactionList.style.display = 'flex';
		panelHeading.textContent = 'Riwayat Pembayaran (Firestore)';
	}
}

tabStudents.addEventListener('click', () => switchTab('students'));
tabTransactions.addEventListener('click', () => switchTab('transactions'));

function renderPayments() {
	const selectedStudent = students.find((student) => student.id === Number(studentSelect.value));
	const totalClassAmount = students.reduce((sum, s) => sum + (s.amount || 0), 0);
	const paidStudents = students.filter((student) => student.amount > 0);

	if (selectedStudent) {
		totalCash.textContent = formatRupiah(selectedStudent.amount);
		selectedStudentName.textContent = selectedStudent.name;
		selectedWeek.textContent = `Minggu ${selectedStudent.week}`;
		paidCount.textContent = `${selectedStudent.week} minggu tercapai`;
		transactionStatus.textContent = `Saldo siswa (${formatRupiah(totalClassAmount)} total kelas)`;
	} else {
		totalCash.textContent = formatRupiah(totalClassAmount);
		selectedStudentName.textContent = 'Belum dipilih';
		selectedWeek.textContent = 'Minggu 0';
		paidCount.textContent = `${paidStudents.length} dari 24 aktif`;
		transactionStatus.textContent = 'Total akumulasi kas seluruh kelas 9D';
	}

	listCount.textContent = String(students.length);

	paymentList.innerHTML = students.map((student) => {
		const isSelected = selectedStudent?.id === student.id;
		return `
			<div class="payment-row ${isSelected ? 'selected' : ''}" data-student-id="${student.id}" style="cursor: pointer;">
				<div class="student-name">
					<span class="student-number">${String(student.id).padStart(2, '0')}</span>
					${student.name}
				</div>
				<div class="student-summary">
					<strong class="student-amount">${formatRupiah(student.amount)}</strong>
					<small>Minggu ${student.week}</small>
				</div>
			</div>
		`;
	}).join('');

	// Clicking row selects student
	paymentList.querySelectorAll('.payment-row').forEach((row) => {
		row.addEventListener('click', () => {
			const id = row.getAttribute('data-student-id');
			studentSelect.value = id;
			renderPayments();
			amountInput.focus();
		});
	});
}

function renderTransactions(transactions) {
	transactionHistory = transactions;
	if (!transactions || transactions.length === 0) {
		transactionList.innerHTML = '<p class="empty-state">Belum ada riwayat pembayaran di Firestore.</p>';
		return;
	}

	transactionList.innerHTML = transactions.map((tx) => {
		const isAdd = tx.changeType === 'ADD';
		let dateLabel = 'Baru saja';
		if (tx.createdAt?.toDate) {
			const d = tx.createdAt.toDate();
			dateLabel = d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		}
		return `
			<div class="tx-row">
				<div class="tx-left">
					<div class="tx-badge ${isAdd ? 'add' : 'decrease'}">
						${isAdd ? '+' : '−'}
					</div>
					<div>
						<div class="tx-title">${tx.studentName || `Siswa #${tx.studentId}`}</div>
						<div class="tx-date">${dateLabel} • ${isAdd ? 'Setoran Kas' : 'Pengurangan Kas'}</div>
					</div>
				</div>
				<div class="tx-amount ${isAdd ? 'add' : 'decrease'}">
					${isAdd ? '+' : '−'} ${formatRupiah(tx.amount)}
				</div>
			</div>
		`;
	}).join('');
}

// Initial render
renderPayments();

// -------------------------------------------------------------
// Firebase & Cloud Firestore Integration
// -------------------------------------------------------------
let auth = null;
let db = null;
let isFirebaseReady = false;

const defaultFirebaseConfig = {
	projectId: 'burnished-mantis-g53bd',
	appId: '1:1043167710020:web:d52bc9da7f924b3239e511',
	apiKey: 'AIzaSyDZ_bUy0cMAO6sSL84lK3j_zn7TQoD9Z-A',
	authDomain: 'burnished-mantis-g53bd.firebaseapp.com',
	firestoreDatabaseId: 'ai-studio-uangkas-4199765b-4c9e-4b10-96b0-048814a9e8da',
	storageBucket: 'burnished-mantis-g53bd.firebasestorage.app',
	messagingSenderId: '1043167710020',
	oAuthClientId: '1043167710020-cmgtdvpj55accuobf15u1812ipmgn54k.apps.googleusercontent.com'
};

let resolveFirebaseReady;
const firebaseReadyPromise = new Promise((resolve) => {
	resolveFirebaseReady = resolve;
});

function handleFirestoreError(error, operationType, path) {
	const errInfo = {
		error: error instanceof Error ? error.message : String(error),
		authInfo: {
			userId: auth?.currentUser?.uid,
			email: auth?.currentUser?.email,
			emailVerified: auth?.currentUser?.emailVerified,
			isAnonymous: auth?.currentUser?.isAnonymous
		},
		operationType,
		path
	};
	console.error('Firestore Error:', JSON.stringify(errInfo));
	return errInfo;
}

async function initFirebase() {
	try {
		let firebaseConfig = defaultFirebaseConfig;
		try {
			const configRes = await fetch('./firebase-applet-config.json');
			if (configRes.ok) {
				const fetched = await configRes.json();
				firebaseConfig = { ...defaultFirebaseConfig, ...fetched };
			}
		} catch {
			// Menggunakan default config
		}

		const app = initializeApp(firebaseConfig);
		auth = getAuth(app);
		db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

		isFirebaseReady = true;
		if (resolveFirebaseReady) resolveFirebaseReady(true);

		// Test connection in background without blocking main UI
		(async () => {
			try {
				await getDocFromServer(doc(db, 'test', 'connection'));
			} catch (err) {
				if (err instanceof Error && err.message.includes('the client is offline')) {
					console.warn('Firestore client dalam mode offline.');
				}
			}
		})();

		// Handle Auth State
		onAuthStateChanged(auth, (user) => {
			if (user) {
				authBtn.style.display = 'none';
				userProfile.style.display = 'flex';
				userName.textContent = user.displayName || user.email || 'Pengguna';
				userName.title = user.email || '';
			} else {
				authBtn.style.display = 'block';
				authBtn.disabled = false;
				authBtn.textContent = 'Masuk Google';
				userProfile.style.display = 'none';
			}
		});

		// Real-time listener for students collection in Firestore
		onSnapshot(collection(db, 'students'), (snapshot) => {
			if (!snapshot.empty) {
				snapshot.forEach((docSnap) => {
					const data = docSnap.data();
					const student = students.find((s) => s.id === data.id);
					if (student) {
						student.amount = Number(data.amount) || 0;
						student.week = Number(data.week) || 0;
						if (data.name && !/^Siswa\s*\d+$/i.test(data.name.trim())) {
							student.name = data.name;
						}
					}
				});
				localStorage.setItem(storageKey, JSON.stringify(students));
				populateStudentSelect();
				renderPayments();
			}
		}, (err) => {
			handleFirestoreError(err, 'list', 'students');
		});

		// Real-time listener for payments collection in Firestore
		const paymentsQuery = query(
			collection(db, 'payments'),
			orderBy('createdAt', 'desc'),
			limit(40)
		);
		onSnapshot(paymentsQuery, (snapshot) => {
			const txs = [];
			snapshot.forEach((docSnap) => {
				txs.push({ id: docSnap.id, ...docSnap.data() });
			});
			renderTransactions(txs);
		}, (err) => {
			handleFirestoreError(err, 'list', 'payments');
		});

	} catch (error) {
		console.error('Error saat inisialisasi Firebase:', error);
		formMessage.textContent = 'Catatan: Mode offline / lokal aktif.';
		if (resolveFirebaseReady) resolveFirebaseReady(false);
	}
}

// Google Auth Handlers
authBtn.addEventListener('click', async () => {
	if (!isFirebaseReady) {
		formMessage.textContent = 'Menghubungkan ke Firebase...';
		formMessage.classList.add('success');
		await Promise.race([
			firebaseReadyPromise,
			new Promise((res) => setTimeout(res, 3000))
		]);
	}

	if (!auth) {
		formMessage.textContent = 'Layanan Firebase belum siap. Silakan refresh halaman atau coba sesaat lagi.';
		formMessage.classList.remove('success');
		return;
	}

	try {
		formMessage.textContent = 'Membuka login Google... (jika tidak muncul, periksa pemblokir pop-up)';
		formMessage.classList.add('success');
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({ prompt: 'select_account' });
		await signInWithPopup(auth, provider);
		formMessage.textContent = 'Berhasil masuk dengan Google!';
		setTimeout(() => { formMessage.textContent = ''; }, 3000);
	} catch (error) {
		console.error('Login error:', error);
		const currentHost = window.location.hostname || 'domain web Anda';
		if (error.code === 'auth/unauthorized-domain') {
			formMessage.textContent = `Domain "${currentHost}" belum diizinkan di Firebase Console. Buka Firebase Console -> Authentication -> Settings -> Authorized domains, lalu tambahkan "${currentHost}".`;
		} else if (error.code === 'auth/popup-blocked') {
			formMessage.textContent = 'Pop-up login diblokir oleh browser. Izinkan pop-up di browser Anda.';
		} else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
			formMessage.textContent = 'Login Google dibatalkan.';
		} else if (error.code === 'auth/operation-not-allowed') {
			formMessage.textContent = 'Metode login Google belum diaktifkan di Firebase Console -> Authentication -> Sign-in method.';
		} else {
			formMessage.textContent = `Gagal login (${error.code || 'error'}): ${error.message || 'Periksa pengaturan Firebase.'}`;
		}
		formMessage.classList.remove('success');
	}
});

logoutBtn.addEventListener('click', async () => {
	if (auth) {
		await signOut(auth);
		formMessage.textContent = 'Anda telah keluar.';
		formMessage.classList.remove('success');
	}
});

// Save payment to Firestore and update student record
async function updatePayment(change) {
	const selectedStudent = students.find((student) => student.id === Number(studentSelect.value));
	const amount = Number(amountInput.value);

	if (!selectedStudent) {
		formMessage.textContent = 'Pilih siswa terlebih dahulu.';
		formMessage.classList.remove('success');
		return;
	}
	if (!amount || amount < 1) {
		formMessage.textContent = 'Masukkan nominal pembayaran.';
		formMessage.classList.remove('success');
		amountInput.focus();
		return;
	}

	if (change < 0 && amount > selectedStudent.amount) {
		formMessage.textContent = 'Nominal pengurangan melebihi saldo siswa saat ini.';
		formMessage.classList.remove('success');
		return;
	}

	const currentUser = auth?.currentUser;
	if (!currentUser) {
		formMessage.textContent = 'Silakan klik "Masuk Google" di kanan atas untuk menyimpan ke Firestore.';
		formMessage.classList.remove('success');
		return;
	}

	const newAmount = selectedStudent.amount + change;
	const newWeek = Math.floor(newAmount / 10000);
	const changeType = change > 0 ? 'ADD' : 'DECREASE';

	submitButton.disabled = true;
	decreaseButton.disabled = true;
	formMessage.textContent = 'Menyimpan transaksi ke Cloud Firestore...';
	formMessage.classList.add('success');

	try {
		// 1. Catat riwayat pembayaran ke collection `payments`
		const paymentDocRef = doc(collection(db, 'payments'));
		await setDoc(paymentDocRef, {
			studentId: selectedStudent.id,
			studentName: selectedStudent.name,
			amount: amount,
			changeType: changeType,
			createdAt: serverTimestamp(),
			createdBy: currentUser.uid
		});

		// 2. Perbarui saldo dan minggu siswa di collection `students`
		const studentDocRef = doc(db, 'students', String(selectedStudent.id));
		await setDoc(studentDocRef, {
			id: selectedStudent.id,
			name: selectedStudent.name,
			amount: newAmount,
			week: newWeek,
			updatedAt: serverTimestamp(),
			updatedBy: currentUser.uid
		}, { merge: true });

		selectedStudent.amount = newAmount;
		selectedStudent.week = newWeek;
		localStorage.setItem(storageKey, JSON.stringify(students));

		formMessage.textContent = `Berhasil! Pembayaran ${selectedStudent.name} sebesar ${formatRupiah(amount)} disimpan ke Firestore.`;
		formMessage.classList.add('success');
		amountInput.value = '';
		renderPayments();
	} catch (err) {
		console.error('Gagal menyimpan transaksi ke Firestore:', err);
		handleFirestoreError(err, 'write', `students/${selectedStudent.id}`);
		formMessage.textContent = 'Gagal menyimpan ke Firestore: ' + (err.message || 'Periksa izin akun Anda.');
		formMessage.classList.remove('success');
	} finally {
		submitButton.disabled = false;
		decreaseButton.disabled = false;
	}
}

submitButton.addEventListener('click', () => updatePayment(Number(amountInput.value)));
decreaseButton.addEventListener('click', () => updatePayment(-Number(amountInput.value)));
studentSelect.addEventListener('change', renderPayments);
amountInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') updatePayment(Number(amountInput.value));
});

// Boot Firebase
initFirebase();
