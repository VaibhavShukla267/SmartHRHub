document.addEventListener('DOMContentLoaded', () => {

    const EMP_KEY = 'smart_hr_employees';
    const PAY_KEY = 'smart_hr_payrolls';

    // Global Data Helpers
    const getEmployees = () => JSON.parse(localStorage.getItem(EMP_KEY)) || [];
    const saveEmployees = (data) => localStorage.setItem(EMP_KEY, JSON.stringify(data));
    const getPayrolls = () => JSON.parse(localStorage.getItem(PAY_KEY)) || [];

    
    const formatRupee = (amt) => {
        if (isNaN(amt) || amt === null || amt === undefined) return "₹0";
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
    };


    const safeFormat = (amt) => {
        if (isNaN(amt) || amt === null || amt === undefined) return "Rs. 0";
        return "Rs. " + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amt);
    };

   /* ================= DASHBOARD LOGIC ================= */
    if (document.getElementById('dashboard-content')) {
        const employees = getEmployees();
        const payrolls = getPayrolls();

        
        const totalDisbursed = payrolls.reduce((sum, record) => sum + (Number(record.netPay) || 0), 0);
        document.getElementById('total-emp').textContent = employees.length;
        document.getElementById('total-pay').textContent = formatRupee(totalDisbursed);

        
        const currentMonthShort = new Date().toLocaleString('default', { month: 'short' }); 
        const activeEmpIds = employees.map(e => e.id);
        const paidActiveEmpIds = new Set(
            payrolls
            .filter(p => p.month === currentMonthShort && activeEmpIds.includes(p.empId))
            .map(p => p.empId)
        );
        let pendingCount = employees.length - paidActiveEmpIds.size;
        if (pendingCount < 0) pendingCount = 0;

        const pendingEl = document.getElementById('pending-count');
        pendingEl.textContent = pendingCount;
        

        if(pendingCount === 0 && employees.length > 0) {
            pendingEl.classList.replace('text-danger', 'text-success');
            if(pendingEl.closest('.card-custom')) pendingEl.closest('.card-custom').classList.replace('border-danger', 'border-success');
        }

        
        const deptCanvas = document.getElementById('deptChart');
        if (deptCanvas) {

            const positionCounts = {};
            employees.forEach(e => {
                const pos = (e.position || "Unknown").trim(); 
                positionCounts[pos] = (positionCounts[pos] || 0) + 1;
            });

            
            if (window.myDeptChart) window.myDeptChart.destroy();

            window.myDeptChart = new Chart(deptCanvas, {
                type: 'bar',
                data: {
                    labels: Object.keys(positionCounts),
                    datasets: [{
                        label: 'Number of Staff',
                        data: Object.values(positionCounts),
                        backgroundColor: '#2563eb',
                        borderRadius: 5,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { 
                            beginAtZero: true, 
                            ticks: { stepSize: 1 } 
                        } 
                    }
                }
            });
        }

        
        const salaryCanvas = document.getElementById('salaryChart');
        if (salaryCanvas && employees.length > 0) {

            const high = employees.filter(e => Number(e.salary) > 50000).length;
            const mid = employees.filter(e => Number(e.salary) >= 25000 && Number(e.salary) <= 50000).length;
            const low = employees.filter(e => Number(e.salary) < 25000).length;

            // Prevent chart duplication bug
            if (window.mySalaryChart) window.mySalaryChart.destroy();

            window.mySalaryChart = new Chart(salaryCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['High (>50k)', 'Mid (25k-50k)', 'Low (<25k)'],
                    datasets: [{
                        data: [high, mid, low],
                        backgroundColor: ['#2563eb', '#06b6d4', '#cbd5e1'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, 
                    cutout: '70%', 
                    plugins: { 
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } 
                    }
                }
            });
        }

        
        const tbody = document.querySelector('#employee-table tbody');
        tbody.innerHTML = '';
        employees.forEach((emp, idx) => {
            const empHistory = payrolls.filter(p => p.empId == emp.id);
            const lastPay = empHistory.length > 0 ? empHistory[empHistory.length - 1] : null;
            const isPaidThisMonth = lastPay && lastPay.month === currentMonthShort;
            
            const lastPayText = lastPay 
                ? `<span class="fw-bold text-dark">${formatRupee(lastPay.netPay)}</span><br><small class="text-muted" style="font-size:0.75rem">${lastPay.date}</small>` 
                : '<span class="text-muted small">Not paid yet</span>';

            const statusIndicator = isPaidThisMonth 
                ? '<i class="bi bi-check-circle-fill text-success" title="Paid this month"></i>' 
                : '<i class="bi bi-exclamation-circle-fill text-danger" title="Pending this month"></i>';

            tbody.innerHTML += `
                <tr>
                    <td><span class="badge bg-light text-dark border">ID-${emp.id}</span></td>
                    <td><div class="d-flex align-items-center gap-2">${statusIndicator}<span class="fw-bold">${emp.name}</span></div></td>
                    <td><span class="badge bg-primary bg-opacity-10 text-primary">${emp.position}</span></td>
                    <td>${formatRupee(emp.salary)}</td>
                    <td>${lastPayText}</td>
                    <td><button onclick="viewHistory(${emp.id})" class="btn btn-sm btn-light border"><i class="bi bi-clock-history"></i> Log</button></td>
                    <td class="text-end">
                        <a href="payroll.html?id=${emp.id}" class="btn btn-sm btn-success rounded-pill px-3 shadow-sm">Pay</a>
                        <a href="update.html?id=${emp.id}" class="btn btn-sm btn-outline-primary rounded-circle border-0"><i class="bi bi-pencil-fill"></i></a>
                        <button onclick="deleteEmp(${idx})" class="btn btn-sm btn-outline-danger rounded-circle border-0"><i class="bi bi-trash-fill"></i></button>
                    </td>
                </tr>`;
        });
    }

    /* ================= HISTORY & PDF GENERATOR ================= */
   /* ================= HISTORY, PDF & DELETE TRANSACTION ================= */
    window.viewHistory = (empId) => {
        const employees = getEmployees();
        const payrolls = getPayrolls();
        const emp = employees.find(e => e.id == empId);
        
        document.getElementById('history-emp-name').textContent = emp ? emp.name : "Unknown";

        
        const mappedPayrolls = payrolls.map((pay, index) => ({ ...pay, originalIndex: index }));


        const myPayments = mappedPayrolls.filter(p => p.empId == empId);
        
        const tbody = document.getElementById('history-table-body');
        const emptyMsg = document.getElementById('history-empty-msg');
        
        tbody.innerHTML = ''; 

        if (myPayments.length === 0) {
            emptyMsg.style.display = 'block';
        } else {
            emptyMsg.style.display = 'none';
            
            
            myPayments.reverse().forEach((pay) => {

                const payDataSafe = btoa(JSON.stringify(pay));
                
                tbody.innerHTML += `
                    <tr>
                        <td>${pay.date}</td>
                        <td><span class="badge bg-info text-dark">${pay.month}</span></td>
                        <td class="fw-bold text-success">${formatRupee(pay.netPay)}</td>
                        <td>
                            <div class="btn-group">
                                <button onclick="generatePayslipPDF('${payDataSafe}')" class="btn btn-sm btn-outline-danger" title="Download Slip">
                                    <i class="bi bi-file-earmark-pdf-fill"></i>
                                </button>
                                <button onclick="deletePayroll(${pay.originalIndex})" class="btn btn-sm btn-outline-secondary" title="Delete Record">
                                    <i class="bi bi-trash-fill"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
            });
        }
        new bootstrap.Modal(document.getElementById('historyModal')).show();
    };

    window.deletePayroll = (index) => {
        Swal.fire({
            title: "Delete Transaction?",
            text: "This will remove this payment from the Total Disbursed amount.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, remove it!'
        }).then((result) => {
            if (result.isConfirmed) {
                const payrolls = getPayrolls();
                
                
                payrolls.splice(index, 1);
                
                
                localStorage.setItem(PAY_KEY, JSON.stringify(payrolls));
                
                
                location.reload();
            }
        });
    };

    window.generatePayslipPDF = (payDataEncoded) => {

        const pay = JSON.parse(atob(payDataEncoded));
        const employees = getEmployees();
        const emp = employees.find(e => e.id == pay.empId);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // HEADER
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("SALARY SLIP", 105, 22, { align: "center" });

        // DETAILS
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("EMPLOYEE", 14, 50);
        doc.setFont("helvetica", "normal");
        // Fallback for deleted employees
        const empName = emp ? emp.name : pay.empName || "Unknown";
        const empPos = emp ? emp.position : "N/A";
        const empId = emp ? emp.id : pay.empId;
        
        doc.text(`Name: ${empName}`, 14, 58);
        doc.text(`ID: ${empId}`, 14, 64);
        doc.text(`Role: ${empPos}`, 14, 70);

        doc.setFont("helvetica", "bold");
        doc.text("PAYMENT DATE", 140, 50);
        doc.setFont("helvetica", "normal");
        doc.text(`${pay.date}`, 140, 58);

        // TABLE
        const d = pay.details || { base: 0, attendance: pay.netPay, ot: 0, penalty: 0, pf: 0, insurance: 0 };
        const tableBody = [
            [{ content: 'EARNINGS', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
            ['Base Salary', safeFormat(d.base)],
            ['Attendance Earnings', safeFormat(d.attendance)],
            ['Overtime Bonus', `+ ${safeFormat(d.ot)}`],
            [{ content: 'DEDUCTIONS', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
            ['WFO Penalty', `- ${safeFormat(d.penalty)}`],
            ['Provident Fund', `- ${safeFormat(d.pf)}`],
            ['Insurance', `- ${safeFormat(d.insurance)}`],
            [{ content: 'NET PAY', styles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 12 } }, 
             { content: safeFormat(pay.netPay), styles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 12, halign: 'right' } }]
        ];

        doc.autoTable({ startY: 80, body: tableBody, theme: 'grid', styles: { fontSize: 10, cellPadding: 5 }, columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } } });
        doc.save(`Payslip_${empName}_${pay.month}.pdf`);
    };
    /* ================= PAYROLL CALCULATOR ================= */
    const payrollForm = document.getElementById('payroll-process-form');
    if (payrollForm) {
        const params = new URLSearchParams(window.location.search);
        const empId = params.get("id");
        const employees = getEmployees();
        const empIndex = employees.findIndex(e => e.id == empId);
        const emp = employees[empIndex];

        if (!emp) window.location.href = "dashboard.html";

        const dateEl = document.getElementById('payment-date');
        if(dateEl) dateEl.valueAsDate = new Date();

        document.getElementById('p-name').value = emp.name;
        document.getElementById('p-base').value = emp.salary;
        document.getElementById('display-base').textContent = formatRupee(emp.salary);

        // Load Employee Settings
        if (emp.settings) {
            document.getElementById("days-worked").value = emp.settings.daysWorked || 30;
            document.getElementById("wfh-allowed").value = emp.settings.wfhAllowed || 0;
            document.getElementById("wfh-done").value = emp.settings.wfhDone || 0;
            document.getElementById("ot-hours").value = emp.settings.otHours || 0;
            if(emp.settings.otRate) document.getElementById("ot-rate").value = emp.settings.otRate;
            document.getElementById("deduct-insurance").value = emp.settings.insurance || 0;
            document.getElementById("deduct-pf").checked = emp.settings.deductPF !== false;
        }

        let currentDetails = {};

        const calculatePayroll = () => {
            const base = emp.salary || 0;
            const daysWorked = Number(document.getElementById("days-worked").value) || 0;
            const perDaySalary = base / 30; 
            const earnedSalary = perDaySalary * daysWorked;

            const otHours = Number(document.getElementById("ot-hours").value) || 0;
            let otRate = Number(document.getElementById("ot-rate").value);
            if(!otRate) otRate = (base / 30) / 8; 
            const otBonus = otHours * otRate;

            const wfoTarget = Number(document.getElementById("wfh-allowed").value) || 0;
            const wfoDone = Number(document.getElementById("wfh-done").value) || 0;
            let penalty = 0;
            if(wfoDone < wfoTarget) {
                penalty = (wfoTarget - wfoDone) * (perDaySalary * 0.5); 
            }

            const insurance = Number(document.getElementById("deduct-insurance").value) || 0;
            let pf = 0;
            if (document.getElementById("deduct-pf").checked) pf = base * 0.12;

            const netPay = earnedSalary + otBonus - penalty - insurance - pf;

            document.getElementById("calc-gross").textContent = formatRupee(earnedSalary);
            document.getElementById("calc-ot").textContent = "+" + formatRupee(otBonus);
            document.getElementById("calc-wfh-penalty").textContent = "-" + formatRupee(penalty);
            document.getElementById("calc-pf").textContent = "-" + formatRupee(pf);
            document.getElementById("calc-insurance").textContent = "-" + formatRupee(insurance);
            document.getElementById("display-net").textContent = formatRupee(netPay);
            document.getElementById("final-net-pay").value = Math.round(netPay);

            // SAVE BREAKDOWN to variable
            currentDetails = {
                base: base,
                attendance: earnedSalary,
                ot: otBonus,
                penalty: penalty,
                pf: pf,
                insurance: insurance
            };
        };

        const inputs = payrollForm.querySelectorAll('input');
        inputs.forEach(input => input.addEventListener('input', calculatePayroll));
        calculatePayroll(); // Run once on load

        payrollForm.addEventListener('submit', (e) => {
            e.preventDefault();
            calculatePayroll(); // Ensure details are fresh

            const dateInput = document.getElementById('payment-date').value;
            const payDateObj = dateInput ? new Date(dateInput) : new Date();
            const dayString = payDateObj.toLocaleDateString('en-IN');
            const monthString = payDateObj.toLocaleString('default', { month: 'short' });

            const payrolls = getPayrolls();
            payrolls.push({
                empId: emp.id,
                empName: emp.name,
                netPay: Number(document.getElementById('final-net-pay').value),
                date: dayString,
                month: monthString,
                details: currentDetails // Saving the breakdown here
            });
            localStorage.setItem(PAY_KEY, JSON.stringify(payrolls));

            employees[empIndex].settings = {
                daysWorked: document.getElementById("days-worked").value,
                wfhAllowed: document.getElementById("wfh-allowed").value,
                wfhDone: document.getElementById("wfh-done").value,
                otHours: document.getElementById("ot-hours").value,
                otRate: document.getElementById("ot-rate").value,
                insurance: document.getElementById("deduct-insurance").value,
                deductPF: document.getElementById("deduct-pf").checked
            };
            saveEmployees(employees);
            
            Swal.fire({
                title: "Salary Disbursed!", 
                text: `Slip generated for ${monthString}.`, 
                icon: "success"
            }).then(() => window.location.href = "dashboard.html");
        });
    }


    const addForm = document.getElementById('add-employee-form');
    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const employees = getEmployees();
            const newEmp = {
                id: Math.floor(1000 + Math.random() * 9000),
                name: document.getElementById('empname').value,
                email: document.getElementById('empemail').value,
                position: document.getElementById('empposition').value,
                salary: Number(document.getElementById('empsalary').value),
            };
            employees.push(newEmp);
            saveEmployees(employees);
            Swal.fire("Success!", "Employee Added", "success").then(() => window.location.href = "dashboard.html");
        });
    }

    const updateForm = document.getElementById('update-employee-form');
    if (updateForm) {
        const params = new URLSearchParams(window.location.search);
        const empId = params.get("id");
        const employees = getEmployees();
        const emp = employees.find(e => e.id == empId);
        if (!emp) window.location.href = "dashboard.html";
        document.getElementById("empname").value = emp.name;
        document.getElementById("empemail").value = emp.email;
        document.getElementById("empposition").value = emp.position;
        document.getElementById("empsalary").value = emp.salary;
        updateForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const index = employees.findIndex(e => e.id == empId);
            employees[index].name = document.getElementById("empname").value;
            employees[index].email = document.getElementById("empemail").value;
            employees[index].position = document.getElementById("empposition").value;
            employees[index].salary = Number(document.getElementById("empsalary").value);
            saveEmployees(employees);
            Swal.fire("Updated!", "Details updated", "success").then(() => window.location.href = "dashboard.html");
        });
    }

    window.deleteEmp = (index) => {
        Swal.fire({
            title: "Delete?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed) {
                const employees = getEmployees();
                employees.splice(index, 1);
                saveEmployees(employees);
                location.reload();
            }
        });
    };

    window.exportExcel = () => {
        const employees = getEmployees();
        const worksheet = XLSX.utils.json_to_sheet(employees);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, "HR_Data.xlsx");
    };

    window.exportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const employees = getEmployees();
        doc.setFontSize(18);
        doc.text("Employee Directory", 14, 22);
        const tableData = employees.map(e => [e.id, e.name, e.position, e.salary, e.email]);
        doc.autoTable({ head: [['ID', 'Name', 'Position', 'Salary', 'Email']], body: tableData, startY: 30 });
        doc.save("Employees.pdf");
    };
});

/* ================= SYSTEM RESET ================= */
    window.resetSystem = () => {
        Swal.fire({
            title: "Reset Financial Data?",
            text: "This will delete all payment history and reset 'Total Disbursed' to ₹0. Your employee list will stay.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, Wipe Data'
        }).then((result) => {
            if (result.isConfirmed) {
                // This command wipes the payment history
                localStorage.removeItem('smart_hr_payrolls');
                
                Swal.fire("Reset!", "System is now at ₹0.", "success")
                .then(() => location.reload());
            }
        });
    };