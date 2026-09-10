import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js';

const firebaseConfig = {
	databaseURL: 'https://uangkas9d-default-rtdb.asia-southeast1.firebasedatabase.app'
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const studentSelect = document.getElementById('studentSelect');
const amountInput = document.getElementById('amountInput');
const submitButton = document.getElementById('btn');
const decreaseButton = document.getElementById('decreaseBtn');
const formMessage = document.getElementById('formMessage');
const paymentList = document.getElementById('paymentList');
const totalCash = document.getElementById('totalCash');
const paidCount = document.getElementById('paidCount');
const transactionStatus = document.getElementById('transactionStatus');
const listCount = document.getElementById('listCount');
const selectedStudentName = document.getElementById('selectedStudentName');
const selectedWeek = document.getElementById('selectedWeek');
const storageKey = 'uangKas9DStudents';

const students = Array.from({ length: 24 }, (_, index) => ({
	id: index + 1,
	name: `Siswa ${String(index + 1).padStart(2, '0')}`,
	amount: 0,
	week: 0
}));

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

const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`;

students.forEach((student) => {
	const option = document.createElement('option');
	option.value = student.id;
	option.textContent = student.name;
	studentSelect.appendChild(option);
});

function renderPayments() {
	const selectedStudent = students.find((student) => student.id === Number(studentSelect.value));
	const paidStudents = students.filter((student) => student.amount > 0);

	totalCash.textContent = selectedStudent ? formatRupiah(selectedStudent.amount) : 'Rp 0';
	selectedStudentName.textContent = selectedStudent ? selectedStudent.name : 'Belum dipilih';
	selectedWeek.textContent = selectedStudent ? `Minggu ${selectedStudent.week}` : 'Minggu 0';
	paidCount.textContent = selectedStudent ? `${selectedStudent.week} minggu tercapai` : 'Dari 24 siswa';
	transactionStatus.textContent = selectedStudent ? 'Saldo siswa terpilih' : 'Pilih siswa untuk melihat saldo';
	listCount.textContent = `${paidStudents.length} siswa membayar`;

	paymentList.innerHTML = students.map((student) => `<div class="payment-row ${selectedStudent?.id === student.id ? 'selected' : ''}"><div class="student-name"><span class="student-number">${String(student.id).padStart(2, '0')}</span>${student.name}</div><div class="student-summary"><strong class="student-amount">${formatRupiah(student.amount)}</strong><small>Minggu ${student.week}</small></div></div>`).join('');
}

function updatePayment(change) {
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
		formMessage.textContent = 'Nominal pengurangan melebihi saldo siswa.';
		formMessage.classList.remove('success');
		return;
	}

	selectedStudent.amount += change;
	selectedStudent.week = Math.floor(selectedStudent.amount / 10000);
	localStorage.setItem(storageKey, JSON.stringify(students));
	formMessage.textContent = `${selectedStudent.name} berhasil ${change > 0 ? 'ditambahkan' : 'dikurangi'}.`;
	formMessage.classList.add('success');
	amountInput.value = '';
	renderPayments();
}

submitButton.addEventListener('click', () => updatePayment(Number(amountInput.value)));
decreaseButton.addEventListener('click', () => updatePayment(-Number(amountInput.value)));
studentSelect.addEventListener('change', renderPayments);
amountInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') updatePayment(Number(amountInput.value));
});

renderPayments();
