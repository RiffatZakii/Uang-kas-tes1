import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
	getFirestore,
	collection,
	doc,
	getDocFromServer,
	setDoc,
	addDoc,
	deleteDoc,
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
const tabExpenses = document.getElementById('tabExpenses');
const tabExpenseCount = document.getElementById('tabExpenseCount');
const expenseList = document.getElementById('expenseList');
const totalExpensesEl = document.getElementById('totalExpenses');
const expenseCountEl = document.getElementById('expenseCount');
const netBalanceEl = document.getElementById('netBalance');
const openExpenseModalBtn = document.getElementById('openExpenseModalBtn');
const expenseModal = document.getElementById('expenseModal');
const closeExpenseModalBtn = document.getElementById('closeExpenseModalBtn');
const cancelExpenseModalBtn = document.getElementById('cancelExpenseModalBtn');
const expenseForm = document.getElementById('expenseForm');
const expenseTitleInput = document.getElementById('expenseTitleInput');
const expenseAmountInput = document.getElementById('expenseAmountInput');
const expenseModalError = document.getElementById('expenseModalError');
const submitExpenseBtn = document.getElementById('submitExpenseBtn');

// In-app Delete Confirmation Modal
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteModalDesc = document.getElementById('deleteModalDesc');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
let pendingDeleteExpenseId = null;

// Topbar Auth / Role elements
const authBtn = document.getElementById('authBtn');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const roleBadge = document.getElementById('roleBadge');

// Permission banner elements
const permissionBanner = document.getElementById('permissionBanner');
const bannerIcon = document.getElementById('bannerIcon');
const permissionTitle = document.getElementById('permissionTitle');
const permissionDesc = document.getElementById('permissionDesc');
const bannerLoginBtn = document.getElementById('bannerLoginBtn');
const entryForm = document.getElementById('entryForm');

// Authority cards and settings elements
const authorityStatusBadge = document.getElementById('authorityStatusBadge');
const cardOwner = document.getElementById('cardOwner');
const cardEditor = document.getElementById('cardEditor');
const ownerStatusTag = document.getElementById('ownerStatusTag');
const editorStatusTag = document.getElementById('editorStatusTag');
const ownerSettingsBox = document.getElementById('ownerSettingsBox');
const changeEditorPwdInput = document.getElementById('changeEditorPwdInput');
const saveEditorPwdBtn = document.getElementById('saveEditorPwdBtn');
const currentEditorPwdDisplay = document.getElementById('currentEditorPwdDisplay');
const changeOwnerPwdInput = document.getElementById('changeOwnerPwdInput');
const saveOwnerPwdBtn = document.getElementById('saveOwnerPwdBtn');
const currentOwnerPwdDisplay = document.getElementById('currentOwnerPwdDisplay');
const ownerSettingMessage = document.getElementById('ownerSettingMessage');

// Password Modal elements
const passwordModal = document.getElementById('passwordModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('passwordInput');
const togglePasswordVisibility = document.getElementById('togglePasswordVisibility');
const modalErrorMessage = document.getElementById('modalErrorMessage');
const roleOptionEditor = document.getElementById('roleOptionEditor');
const roleOptionOwner = document.getElementById('roleOptionOwner');

const storageKey = 'uangKas9DStudents';
const ROLE_STORAGE_KEY = 'uangKas9D_activeRole';

// Passwords State (Defaults + Synced with Firestore)
let defaultPasswords = {
	ownerPassword: 'riffat9d',
	editorPassword: 'editor9d'
};

let currentOwnerPassword = localStorage.getItem('uangKas9D_ownerPwd') || defaultPasswords.ownerPassword;
let currentEditorPassword = localStorage.getItem('uangKas9D_editorPwd') || defaultPasswords.editorPassword;
let currentRole = localStorage.getItem(ROLE_STORAGE_KEY) || 'guest'; // 'guest' | 'editor' | 'owner'

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

// Fallback to local cache if present
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
let currentTab = 'students'; // 'students' | 'transactions' | 'expenses'
let transactionHistory = [];
let expenseHistory = [];

function switchTab(tab) {
	currentTab = tab;
	if (tab === 'students') {
		tabStudents.classList.add('active');
		tabTransactions.classList.remove('active');
		if (tabExpenses) tabExpenses.classList.remove('active');
		paymentList.style.display = 'grid';
		transactionList.style.display = 'none';
		if (expenseList) expenseList.style.display = 'none';
		panelHeading.textContent = 'Rekap Kas Siswa';
	} else if (tab === 'transactions') {
		tabStudents.classList.remove('active');
		tabTransactions.classList.add('active');
		if (tabExpenses) tabExpenses.classList.remove('active');
		paymentList.style.display = 'none';
		transactionList.style.display = 'flex';
		if (expenseList) expenseList.style.display = 'none';
		panelHeading.textContent = 'Riwayat Pembayaran (Firestore)';
	} else if (tab === 'expenses') {
		tabStudents.classList.remove('active');
		tabTransactions.classList.remove('active');
		if (tabExpenses) tabExpenses.classList.add('active');
		paymentList.style.display = 'none';
		transactionList.style.display = 'none';
		if (expenseList) expenseList.style.display = 'flex';
		panelHeading.textContent = 'Daftar Pengeluaran Kas Kelas 9D';
	}
}

tabStudents.addEventListener('click', () => switchTab('students'));
tabTransactions.addEventListener('click', () => switchTab('transactions'));
if (tabExpenses) tabExpenses.addEventListener('click', () => switchTab('expenses'));

function renderPayments() {
	const selectedStudent = students.find((student) => student.id === Number(studentSelect.value));
	const totalClassAmount = students.reduce((sum, s) => sum + (s.amount || 0), 0);
	const paidStudents = students.filter((student) => student.amount > 0);

	const sumExpenses = expenseHistory.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
	const netBalance = totalClassAmount - sumExpenses;

	if (totalExpensesEl) totalExpensesEl.textContent = formatRupiah(sumExpenses);
	if (expenseCountEl) expenseCountEl.textContent = `${expenseHistory.length} pengeluaran tercatat`;
	if (netBalanceEl) netBalanceEl.textContent = formatRupiah(netBalance);
	if (tabExpenseCount) tabExpenseCount.textContent = String(expenseHistory.length);

	if (selectedStudent) {
		if (totalCash) totalCash.textContent = formatRupiah(selectedStudent.amount);
		if (selectedStudentName) selectedStudentName.textContent = selectedStudent.name;
		if (selectedWeek) selectedWeek.textContent = `Minggu ${selectedStudent.week}`;
		if (paidCount) paidCount.textContent = `${selectedStudent.week} minggu tercapai`;
		if (transactionStatus) transactionStatus.textContent = `Saldo siswa (${formatRupiah(totalClassAmount)} total kelas)`;
	} else {
		if (totalCash) totalCash.textContent = formatRupiah(totalClassAmount);
		if (selectedStudentName) selectedStudentName.textContent = 'Belum dipilih';
		if (selectedWeek) selectedWeek.textContent = 'Minggu 0';
		if (paidCount) paidCount.textContent = `${paidStudents.length} dari 24 aktif`;
		if (transactionStatus) transactionStatus.textContent = 'Total akumulasi kas seluruh kelas 9D';
	}

	if (listCount) listCount.textContent = String(students.length);

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
		} else if (typeof tx.createdAt === 'string') {
			try {
				const d = new Date(tx.createdAt);
				dateLabel = d.toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				});
			} catch {
				dateLabel = tx.createdAt;
			}
		}

		const recorder = tx.createdBy || 'Petugas Kas';

		return `
			<div class="tx-row">
				<div class="tx-left">
					<div class="tx-badge ${isAdd ? 'add' : 'decrease'}">
						${isAdd ? '+' : '−'}
					</div>
					<div>
						<div class="tx-title">${tx.studentName || `Siswa #${tx.studentId}`}</div>
						<div class="tx-date">${dateLabel} • ${isAdd ? 'Setoran Kas' : 'Pengurangan Kas'} • oleh ${recorder}</div>
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
function renderExpenses(expenses) {
	expenseHistory = expenses || [];
	if (tabExpenseCount) tabExpenseCount.textContent = String(expenseHistory.length);
	if (expenseCountEl) expenseCountEl.textContent = `${expenseHistory.length} pengeluaran tercatat`;

	const sumExpenses = expenseHistory.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
	if (totalExpensesEl) totalExpensesEl.textContent = formatRupiah(sumExpenses);

	const totalClassAmount = students.reduce((sum, s) => sum + (s.amount || 0), 0);
	if (netBalanceEl) netBalanceEl.textContent = formatRupiah(totalClassAmount - sumExpenses);

	if (!expenseList) return;

	if (!expenses || expenses.length === 0) {
		expenseList.innerHTML = '<p class="empty-state">Belum ada pengeluaran kas tercatat di Firestore.</p>';
		return;
	}

	const canDelete = currentRole === 'owner' || currentRole === 'editor';

	expenseList.innerHTML = expenses.map((exp) => {
		let dateLabel = 'Baru saja';
		if (exp.createdAt?.toDate) {
			const d = exp.createdAt.toDate();
			dateLabel = d.toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} else if (typeof exp.createdAt === 'string') {
			try {
				const d = new Date(exp.createdAt);
				dateLabel = d.toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				});
			} catch {
				dateLabel = exp.createdAt;
			}
		}

		const recorder = exp.createdBy || 'Petugas Kas';
		const deleteBtnHtml = canDelete 
			? `<button type="button" class="delete-expense-btn" data-expense-id="${exp.id}" title="Hapus catatan pengeluaran ini">🗑️ Hapus</button>` 
			: `<button type="button" class="delete-expense-btn locked" data-expense-id="${exp.id}" title="Akses terkunci: Klik untuk masuk sebagai Owner/Editor">🔒 Hapus</button>`;

		return `
			<div class="tx-row">
				<div class="tx-left">
					<div class="tx-badge expense">
						📉
					</div>
					<div>
						<div class="tx-title">${escapeHtml(exp.title || 'Pengeluaran')}</div>
						<div class="tx-date">${dateLabel} • oleh ${escapeHtml(recorder)}</div>
					</div>
				</div>
				<div style="display: flex; align-items: center;">
					<div class="tx-amount expense">
						- ${formatRupiah(exp.amount)}
					</div>
					${deleteBtnHtml}
				</div>
			</div>
		`;
	}).join('');

	expenseList.querySelectorAll('.delete-expense-btn').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const expId = btn.getAttribute('data-expense-id');
			if (expId) {
				const expItem = expenseHistory.find(item => item.id === expId);
				confirmAndDeleteExpense(expId, expItem?.title, expItem?.amount);
			}
		});
	});
}

function escapeHtml(str) {
	if (!str) return '';
	return String(str).replace(/[&<>'"]/g, 
		tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// -------------------------------------------------------------
// Authority UI & Permissions State Management
// -------------------------------------------------------------
function updateAccessUI() {
	const canEdit = currentRole === 'owner' || currentRole === 'editor';

	if (currentRole === 'owner') {
		// Owner UI
		if (roleBadge) {
			roleBadge.textContent = '👑 Owner (Riffat Zaki)';
			roleBadge.className = 'role-badge owner';
		}
		if (authBtn) authBtn.style.display = 'none';
		if (userProfile) {
			userProfile.style.display = 'flex';
			if (userName) userName.textContent = '👑 Riffat Zaki (Owner)';
		}

		if (permissionBanner) {
			permissionBanner.className = 'permission-banner owner';
			if (bannerIcon) bannerIcon.textContent = '👑';
			if (permissionTitle) permissionTitle.textContent = 'Akses Owner Aktif (Riffat Zaki Arrabani)';
			if (permissionDesc) permissionDesc.innerHTML = 'Anda memiliki kontrol penuh atas transaksi uang kas kelas 9D dan dapat mengelola kata sandi sistem.';
			if (bannerLoginBtn) bannerLoginBtn.style.display = 'none';
		}

		if (ownerStatusTag) {
			ownerStatusTag.textContent = 'Aktif (Terbuka)';
			ownerStatusTag.className = 'authority-status active-owner';
		}
		if (editorStatusTag) {
			editorStatusTag.textContent = 'Siap Digunakan';
			editorStatusTag.className = 'authority-status active';
		}
		if (cardOwner) cardOwner.className = 'authority-card active owner-card';
		if (cardEditor) cardEditor.className = 'authority-card';
		if (authorityStatusBadge) authorityStatusBadge.textContent = '👑 Akses Owner Aktif';
		if (ownerSettingsBox) ownerSettingsBox.style.display = 'block';

		if (currentEditorPwdDisplay) currentEditorPwdDisplay.textContent = 'Tersimpan aman (••••••)';
		if (currentOwnerPwdDisplay) currentOwnerPwdDisplay.textContent = 'Tersimpan aman (••••••)';

	} else if (currentRole === 'editor') {
		// Editor UI
		if (roleBadge) {
			roleBadge.textContent = '✏️ Editor Kas';
			roleBadge.className = 'role-badge editor';
		}
		if (authBtn) authBtn.style.display = 'none';
		if (userProfile) {
			userProfile.style.display = 'flex';
			if (userName) userName.textContent = '✏️ Editor Kas';
		}

		if (permissionBanner) {
			permissionBanner.className = 'permission-banner editor';
			if (bannerIcon) bannerIcon.textContent = '✏️';
			if (permissionTitle) permissionTitle.textContent = 'Akses Editor Aktif';
			if (permissionDesc) permissionDesc.innerHTML = 'Anda dapat menambah setoran atau mencatat pengurangan uang kas siswa kelas 9D.';
			if (bannerLoginBtn) bannerLoginBtn.style.display = 'none';
		}

		if (ownerStatusTag) {
			ownerStatusTag.textContent = 'Terkunci';
			ownerStatusTag.className = 'authority-status locked';
		}
		if (editorStatusTag) {
			editorStatusTag.textContent = 'Aktif (Terbuka)';
			editorStatusTag.className = 'authority-status active';
		}
		if (cardOwner) cardOwner.className = 'authority-card';
		if (cardEditor) cardEditor.className = 'authority-card active';
		if (authorityStatusBadge) authorityStatusBadge.textContent = '✏️ Akses Editor Aktif';
		if (ownerSettingsBox) ownerSettingsBox.style.display = 'none';

	} else {
		// Guest / Mode Tamu (Read-Only)
		if (roleBadge) {
			roleBadge.textContent = 'Mode Tamu (Hanya Lihat)';
			roleBadge.className = 'role-badge viewer';
		}
		if (authBtn) {
			authBtn.style.display = 'block';
			authBtn.textContent = 'Masuk Otoritas 🔑';
		}
		if (userProfile) userProfile.style.display = 'none';

		if (permissionBanner) {
			permissionBanner.className = 'permission-banner viewer';
			if (bannerIcon) bannerIcon.textContent = '🔒';
			if (permissionTitle) permissionTitle.textContent = 'Mode Tamu (Hanya Lihat)';
			if (permissionDesc) permissionDesc.innerHTML = 'Formulir transaksi kas terkunci. Masukkan kata sandi Editor atau Owner untuk membuka izin edit.';
			if (bannerLoginBtn) {
				bannerLoginBtn.style.display = 'block';
				bannerLoginBtn.textContent = 'Masuk Otoritas 🔑';
			}
		}

		if (ownerStatusTag) {
			ownerStatusTag.textContent = 'Terkunci';
			ownerStatusTag.className = 'authority-status locked';
		}
		if (editorStatusTag) {
			editorStatusTag.textContent = 'Terkunci';
			editorStatusTag.className = 'authority-status locked';
		}
		if (cardOwner) cardOwner.className = 'authority-card';
		if (cardEditor) cardEditor.className = 'authority-card';
		if (authorityStatusBadge) authorityStatusBadge.textContent = 'Mode Tamu';
		if (ownerSettingsBox) ownerSettingsBox.style.display = 'none';
	}

	// Toggle Form elements enablement
	if (entryForm) {
		if (canEdit) {
			entryForm.classList.remove('disabled');
		} else {
			entryForm.classList.add('disabled');
		}
	}
	studentSelect.disabled = !canEdit;
	amountInput.disabled = !canEdit;
	submitButton.disabled = !canEdit;
	decreaseButton.disabled = !canEdit;

	// Refresh expense items to reflect new role permission on delete buttons
	if (expenseHistory && expenseHistory.length > 0) {
		renderExpenses(expenseHistory);
	}
}

// -------------------------------------------------------------
// Password Modal Handling
// -------------------------------------------------------------
function openPasswordModal(preferredRole = 'editor') {
	modalErrorMessage.textContent = '';
	passwordInput.value = '';
	passwordInput.type = 'password';
	togglePasswordVisibility.textContent = '👁️';

	// Select radio
	const radios = document.getElementsByName('authRole');
	radios.forEach((r) => {
		r.checked = r.value === preferredRole;
	});
	updateRoleOptionStyles(preferredRole);

	passwordModal.style.display = 'grid';
	setTimeout(() => passwordInput.focus(), 80);
}

function closePasswordModal() {
	passwordModal.style.display = 'none';
	modalErrorMessage.textContent = '';
}

function updateRoleOptionStyles(selectedVal) {
	if (selectedVal === 'owner') {
		roleOptionOwner.className = 'role-option selected owner';
		roleOptionEditor.className = 'role-option';
	} else {
		roleOptionEditor.className = 'role-option selected';
		roleOptionOwner.className = 'role-option';
	}
}

// Radio option change handlers
roleOptionEditor.addEventListener('click', () => {
	const radio = roleOptionEditor.querySelector('input');
	radio.checked = true;
	updateRoleOptionStyles('editor');
	modalErrorMessage.textContent = '';
	passwordInput.focus();
});

roleOptionOwner.addEventListener('click', () => {
	const radio = roleOptionOwner.querySelector('input');
	radio.checked = true;
	updateRoleOptionStyles('owner');
	modalErrorMessage.textContent = '';
	passwordInput.focus();
});

// Toggle password visibility
togglePasswordVisibility.addEventListener('click', () => {
	if (passwordInput.type === 'password') {
		passwordInput.type = 'text';
		togglePasswordVisibility.textContent = '🙈';
	} else {
		passwordInput.type = 'password';
		togglePasswordVisibility.textContent = '👁️';
	}
	passwordInput.focus();
});

// Open modal triggers
if (authBtn) authBtn.addEventListener('click', () => openPasswordModal('editor'));
if (bannerLoginBtn) bannerLoginBtn.addEventListener('click', () => openPasswordModal('editor'));
if (cardOwner) cardOwner.addEventListener('click', () => {
	if (currentRole !== 'owner') openPasswordModal('owner');
});
if (cardEditor) cardEditor.addEventListener('click', () => {
	if (currentRole === 'guest') openPasswordModal('editor');
});

// Close modal triggers
closeModalBtn.addEventListener('click', closePasswordModal);
cancelModalBtn.addEventListener('click', closePasswordModal);
passwordModal.addEventListener('click', (e) => {
	if (e.target === passwordModal) closePasswordModal();
});
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && passwordModal.style.display !== 'none') {
		closePasswordModal();
	}
});

// Submit password form
passwordForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const chosenRole = document.querySelector('input[name="authRole"]:checked')?.value || 'editor';
	const enteredPassword = passwordInput.value.trim();

	if (!enteredPassword) {
		modalErrorMessage.textContent = 'Silakan ketik kata sandi.';
		passwordInput.focus();
		return;
	}

	if (chosenRole === 'owner') {
		if (enteredPassword === currentOwnerPassword) {
			currentRole = 'owner';
			localStorage.setItem(ROLE_STORAGE_KEY, 'owner');
			closePasswordModal();
			updateAccessUI();
			formMessage.textContent = 'Selamat datang, Riffat Zaki (Owner)! Akses penuh aktif.';
			formMessage.classList.add('success');
			setTimeout(() => { formMessage.textContent = ''; }, 4000);
		} else {
			modalErrorMessage.textContent = 'Kata sandi Owner tidak sesuai. Silakan coba lagi.';
			passwordInput.select();
		}
	} else {
		// Editor role check
		// Owner password can also unlock editor mode
		if (enteredPassword === currentEditorPassword || enteredPassword === currentOwnerPassword) {
			currentRole = 'editor';
			localStorage.setItem(ROLE_STORAGE_KEY, 'editor');
			closePasswordModal();
			updateAccessUI();
			formMessage.textContent = 'Akses Editor Kas berhasil dibuka! Anda dapat mencatat transaksi.';
			formMessage.classList.add('success');
			setTimeout(() => { formMessage.textContent = ''; }, 4000);
		} else {
			modalErrorMessage.textContent = 'Kata sandi Editor tidak sesuai. Silakan coba lagi.';
			passwordInput.select();
		}
	}
});

// Logout / Lock Access handler
logoutBtn.addEventListener('click', () => {
	currentRole = 'guest';
	localStorage.removeItem(ROLE_STORAGE_KEY);
	updateAccessUI();
	formMessage.textContent = 'Akses telah dikunci. Sekarang dalam Mode Tamu (Hanya Lihat).';
	formMessage.classList.add('success');
	setTimeout(() => { formMessage.textContent = ''; }, 3000);
});

// Initial access UI
updateAccessUI();

// -------------------------------------------------------------
// Firebase Cloud Firestore Synchronization
// -------------------------------------------------------------
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
		db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
		isFirebaseReady = true;

		// 1. Real-time listener for Settings / Passwords in Firestore
		const pwdDocRef = doc(db, 'settings', 'passwords');
		onSnapshot(pwdDocRef, async (docSnap) => {
			if (docSnap.exists()) {
				const data = docSnap.data();
				if (data.ownerPassword) {
					currentOwnerPassword = String(data.ownerPassword);
					localStorage.setItem('uangKas9D_ownerPwd', currentOwnerPassword);
				}
				if (data.editorPassword) {
					currentEditorPassword = String(data.editorPassword);
					localStorage.setItem('uangKas9D_editorPwd', currentEditorPassword);
				}
				updateAccessUI();
			} else {
				// Initialize default passwords in Firestore doc
				try {
					await setDoc(pwdDocRef, {
						ownerPassword: defaultPasswords.ownerPassword,
						editorPassword: defaultPasswords.editorPassword,
						updatedAt: new Date().toISOString(),
						updatedBy: 'Riffat Zaki (Owner)'
					});
				} catch (e) {
					console.warn('Gagal menginisialisasi password di Firestore:', e);
				}
			}
		}, (err) => {
			console.warn('Listener password error:', err);
		});

		// 2. Real-time listener for students collection
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
			console.warn('Listener students error:', err);
		});

		// 3. Real-time listener for payments ledger
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
			console.warn('Listener payments error:', err);
		});

		// 4. Real-time listener for expenses
		const expensesQuery = query(
			collection(db, 'expenses'),
			orderBy('createdAt', 'desc'),
			limit(40)
		);
		onSnapshot(expensesQuery, (snapshot) => {
			const exps = [];
			snapshot.forEach((docSnap) => {
				exps.push({ id: docSnap.id, ...docSnap.data() });
			});
			renderExpenses(exps);
		}, (err) => {
			console.warn('Listener expenses error:', err);
		});

	} catch (error) {
		console.error('Error saat inisialisasi Firebase:', error);
		formMessage.textContent = 'Catatan: Mode offline / lokal aktif.';
	}
}

// -------------------------------------------------------------
// Owner Settings: Password Management Handlers
// -------------------------------------------------------------
if (saveEditorPwdBtn && changeEditorPwdInput) {
	saveEditorPwdBtn.addEventListener('click', async () => {
		const newPwd = changeEditorPwdInput.value.trim();
		if (!newPwd || newPwd.length < 3) {
			ownerSettingMessage.textContent = 'Kata sandi editor minimal 3 karakter.';
			ownerSettingMessage.classList.remove('success');
			changeEditorPwdInput.focus();
			return;
		}

		saveEditorPwdBtn.disabled = true;
		ownerSettingMessage.textContent = 'Menyimpan kata sandi editor baru ke Cloud...';
		ownerSettingMessage.classList.add('success');

		try {
			currentEditorPassword = newPwd;
			localStorage.setItem('uangKas9D_editorPwd', newPwd);
			if (db) {
				await setDoc(doc(db, 'settings', 'passwords'), {
					editorPassword: newPwd,
					updatedAt: new Date().toISOString(),
					updatedBy: 'Riffat Zaki (Owner)'
				}, { merge: true });
			}
			changeEditorPwdInput.value = '';
			if (currentEditorPwdDisplay) currentEditorPwdDisplay.textContent = 'Tersimpan aman (••••••)';
			ownerSettingMessage.textContent = 'Berhasil! Kata sandi Editor baru telah diperbarui dan disimpan ke Cloud.';
			ownerSettingMessage.classList.add('success');
			setTimeout(() => { ownerSettingMessage.textContent = ''; }, 4000);
		} catch (err) {
			console.error('Gagal menyimpan kata sandi editor:', err);
			ownerSettingMessage.textContent = 'Gagal menyimpan: ' + (err.message || 'Coba lagi nanti.');
			ownerSettingMessage.classList.remove('success');
		} finally {
			saveEditorPwdBtn.disabled = false;
		}
	});

	changeEditorPwdInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') saveEditorPwdBtn.click();
	});
}

if (saveOwnerPwdBtn && changeOwnerPwdInput) {
	saveOwnerPwdBtn.addEventListener('click', async () => {
		const newPwd = changeOwnerPwdInput.value.trim();
		if (!newPwd || newPwd.length < 4) {
			ownerSettingMessage.textContent = 'Kata sandi owner minimal 4 karakter.';
			ownerSettingMessage.classList.remove('success');
			changeOwnerPwdInput.focus();
			return;
		}

		saveOwnerPwdBtn.disabled = true;
		ownerSettingMessage.textContent = 'Menyimpan kata sandi owner baru ke Cloud...';
		ownerSettingMessage.classList.add('success');

		try {
			currentOwnerPassword = newPwd;
			localStorage.setItem('uangKas9D_ownerPwd', newPwd);
			if (db) {
				await setDoc(doc(db, 'settings', 'passwords'), {
					ownerPassword: newPwd,
					updatedAt: new Date().toISOString(),
					updatedBy: 'Riffat Zaki (Owner)'
				}, { merge: true });
			}
			changeOwnerPwdInput.value = '';
			if (currentOwnerPwdDisplay) currentOwnerPwdDisplay.textContent = 'Tersimpan aman (••••••)';
			ownerSettingMessage.textContent = 'Berhasil! Kata sandi Owner baru telah diperbarui dan disimpan ke Cloud.';
			ownerSettingMessage.classList.add('success');
			setTimeout(() => { ownerSettingMessage.textContent = ''; }, 4000);
		} catch (err) {
			console.error('Gagal menyimpan kata sandi owner:', err);
			ownerSettingMessage.textContent = 'Gagal menyimpan: ' + (err.message || 'Coba lagi nanti.');
			ownerSettingMessage.classList.remove('success');
		} finally {
			saveOwnerPwdBtn.disabled = false;
		}
	});

	changeOwnerPwdInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') saveOwnerPwdBtn.click();
	});
}

// -------------------------------------------------------------
// Save Payment Transaction to Cloud Firestore
// -------------------------------------------------------------
async function updatePayment(change) {
	const canEdit = currentRole === 'owner' || currentRole === 'editor';
	if (!canEdit) {
		formMessage.textContent = 'Akses terkunci: Masukkan kata sandi Editor atau Owner untuk menginput pembayaran.';
		formMessage.classList.remove('success');
		openPasswordModal('editor');
		return;
	}

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

	const newAmount = selectedStudent.amount + change;
	const newWeek = Math.floor(newAmount / 10000);
	const changeType = change > 0 ? 'ADD' : 'DECREASE';
	const recorderLabel = currentRole === 'owner' ? 'Owner (Riffat Zaki)' : 'Editor Kas';

	submitButton.disabled = true;
	decreaseButton.disabled = true;
	formMessage.textContent = 'Menyimpan transaksi ke Cloud Firestore...';
	formMessage.classList.add('success');

	try {
		if (db) {
			// 1. Catat riwayat pembayaran ke collection `payments`
			const paymentDocRef = doc(collection(db, 'payments'));
			await setDoc(paymentDocRef, {
				studentId: selectedStudent.id,
				studentName: selectedStudent.name,
				amount: amount,
				changeType: changeType,
				createdAt: new Date().toISOString(),
				createdBy: recorderLabel
			});

			// 2. Perbarui saldo dan minggu siswa di collection `students`
			const studentDocRef = doc(db, 'students', String(selectedStudent.id));
			await setDoc(studentDocRef, {
				id: selectedStudent.id,
				name: selectedStudent.name,
				amount: newAmount,
				week: newWeek,
				updatedAt: new Date().toISOString(),
				updatedBy: recorderLabel
			}, { merge: true });
		}

		selectedStudent.amount = newAmount;
		selectedStudent.week = newWeek;
		localStorage.setItem(storageKey, JSON.stringify(students));

		formMessage.textContent = `Berhasil! Pembayaran ${selectedStudent.name} sebesar ${formatRupiah(amount)} dicatat oleh ${recorderLabel}.`;
		formMessage.classList.add('success');
		amountInput.value = '';
		renderPayments();
	} catch (err) {
		console.error('Gagal menyimpan transaksi ke Firestore:', err);
		formMessage.textContent = 'Gagal menyimpan ke Firestore: ' + (err.message || 'Periksa koneksi.');
		formMessage.classList.remove('success');
	} finally {
		if (currentRole === 'owner' || currentRole === 'editor') {
			submitButton.disabled = false;
			decreaseButton.disabled = false;
		}
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

// -------------------------------------------------------------
// Expense Feature Handlers & Modal
// -------------------------------------------------------------
function openExpenseModal() {
	const canEdit = currentRole === 'owner' || currentRole === 'editor';
	if (!canEdit) {
		formMessage.textContent = 'Akses terkunci: Masukkan kata sandi Editor atau Owner untuk mencatat pengeluaran.';
		formMessage.classList.remove('success');
		openPasswordModal('editor');
		return;
	}

	if (expenseModal) {
		expenseModal.style.display = 'flex';
		if (expenseModalError) expenseModalError.textContent = '';
		if (expenseTitleInput) {
			expenseTitleInput.value = '';
			setTimeout(() => expenseTitleInput.focus(), 60);
		}
		if (expenseAmountInput) expenseAmountInput.value = '';
	}
}

function closeExpenseModal() {
	if (expenseModal) {
		expenseModal.style.display = 'none';
		if (expenseModalError) expenseModalError.textContent = '';
	}
}

if (openExpenseModalBtn) {
	openExpenseModalBtn.addEventListener('click', openExpenseModal);
}
if (closeExpenseModalBtn) {
	closeExpenseModalBtn.addEventListener('click', closeExpenseModal);
}
if (cancelExpenseModalBtn) {
	cancelExpenseModalBtn.addEventListener('click', closeExpenseModal);
}
if (expenseModal) {
	expenseModal.addEventListener('click', (e) => {
		if (e.target === expenseModal) closeExpenseModal();
	});
}

document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && expenseModal && expenseModal.style.display !== 'none') {
		closeExpenseModal();
	}
});

async function handleExpenseSubmit(e) {
	e.preventDefault();
	const canEdit = currentRole === 'owner' || currentRole === 'editor';
	if (!canEdit) {
		if (expenseModalError) expenseModalError.textContent = 'Akses ditolak: Hanya Owner atau Editor yang dapat mencatat pengeluaran.';
		return;
	}

	const title = expenseTitleInput.value.trim();
	const amount = Number(expenseAmountInput.value);

	if (!title || title.length < 2) {
		if (expenseModalError) expenseModalError.textContent = 'Keterangan pengeluaran minimal 2 karakter.';
		expenseTitleInput.focus();
		return;
	}

	if (!amount || amount < 500) {
		if (expenseModalError) expenseModalError.textContent = 'Nominal pengeluaran minimal Rp 500.';
		expenseAmountInput.focus();
		return;
	}

	submitExpenseBtn.disabled = true;
	submitExpenseBtn.textContent = 'Menyimpan...';

	try {
		const recorderLabel = currentRole === 'owner' ? 'Owner (Riffat Zaki)' : 'Editor Kas';
		if (db && isFirebaseReady) {
			const expenseDoc = {
				title,
				amount,
				createdBy: recorderLabel,
				createdAt: serverTimestamp()
			};
			await addDoc(collection(db, 'expenses'), expenseDoc);
		} else {
			// Local fallback
			const newLocalExpense = {
				id: 'local_' + Date.now(),
				title,
				amount,
				createdBy: recorderLabel,
				createdAt: new Date().toISOString()
			};
			expenseHistory.unshift(newLocalExpense);
			renderExpenses(expenseHistory);
		}

		closeExpenseModal();
		switchTab('expenses');
		formMessage.textContent = `Berhasil! Pengeluaran "${title}" sebesar ${formatRupiah(amount)} berhasil dicatat.`;
		formMessage.classList.add('success');
		setTimeout(() => { formMessage.textContent = ''; }, 4500);
	} catch (err) {
		console.error('Gagal mencatat pengeluaran:', err);
		if (expenseModalError) expenseModalError.textContent = 'Gagal menyimpan: ' + (err.message || 'Periksa koneksi.');
	} finally {
		submitExpenseBtn.disabled = false;
		submitExpenseBtn.textContent = 'Simpan Pengeluaran 📉';
	}
}

if (expenseForm) {
	expenseForm.addEventListener('submit', handleExpenseSubmit);
}

function confirmAndDeleteExpense(expenseId, title, amount) {
	const canDelete = currentRole === 'owner' || currentRole === 'editor';
	if (!canDelete) {
		formMessage.textContent = 'Akses terkunci: Masukkan kata sandi Editor atau Owner untuk menghapus pengeluaran.';
		formMessage.classList.remove('success');
		openPasswordModal('editor');
		return;
	}

	pendingDeleteExpenseId = expenseId;
	if (deleteConfirmModal) {
		if (deleteModalDesc) {
			const label = title ? `"${title}"` : 'pengeluaran ini';
			const amountText = amount ? ` sebesar ${formatRupiah(amount)}` : '';
			deleteModalDesc.textContent = `Apakah Anda yakin ingin menghapus catatan ${label}${amountText}? Saldo kas kelas akan diperbarui secara otomatis.`;
		}
		deleteConfirmModal.style.display = 'flex';
	} else {
		// Fallback
		executeDeleteExpense(expenseId);
	}
}

function closeDeleteConfirmModal() {
	if (deleteConfirmModal) {
		deleteConfirmModal.style.display = 'none';
	}
	pendingDeleteExpenseId = null;
}

if (closeDeleteModalBtn) {
	closeDeleteModalBtn.addEventListener('click', closeDeleteConfirmModal);
}
if (cancelDeleteBtn) {
	cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
}
if (deleteConfirmModal) {
	deleteConfirmModal.addEventListener('click', (e) => {
		if (e.target === deleteConfirmModal) closeDeleteConfirmModal();
	});
}

if (confirmDeleteBtn) {
	confirmDeleteBtn.addEventListener('click', async () => {
		if (!pendingDeleteExpenseId) return;
		const idToDelete = pendingDeleteExpenseId;
		confirmDeleteBtn.disabled = true;
		confirmDeleteBtn.textContent = 'Menghapus...';
		try {
			await executeDeleteExpense(idToDelete);
		} finally {
			confirmDeleteBtn.disabled = false;
			confirmDeleteBtn.textContent = 'Hapus Catatan 🗑️';
			closeDeleteConfirmModal();
		}
	});
}

document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && deleteConfirmModal && deleteConfirmModal.style.display !== 'none') {
		closeDeleteConfirmModal();
	}
});

async function executeDeleteExpense(expenseId) {
	try {
		if (db && isFirebaseReady && !expenseId.startsWith('local_')) {
			await deleteDoc(doc(db, 'expenses', expenseId));
		} else {
			expenseHistory = expenseHistory.filter(e => e.id !== expenseId);
			renderExpenses(expenseHistory);
		}
		formMessage.textContent = 'Catatan pengeluaran berhasil dihapus dan saldo kas telah disesuaikan.';
		formMessage.classList.add('success');
		setTimeout(() => { formMessage.textContent = ''; }, 3500);
	} catch (err) {
		console.error('Gagal menghapus pengeluaran:', err);
		formMessage.textContent = 'Gagal menghapus: ' + (err.message || 'Periksa koneksi.');
		formMessage.classList.remove('success');
	}
}
