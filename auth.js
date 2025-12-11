const SESSION_KEY = 'smart_hr_user';
const USERS_DB_KEY = 'smart_hr_users_db';


(function initDB() {
    const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || [];
    if (users.length === 0) {
        users.push({ name: "HR Administrator", email: "admin@hr.com", password: "123" });
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    }
})();


(function protectRoute() {
    const protectedPages = ['dashboard.html', 'add.html', 'payroll.html', 'update.html'];
    const currentPath = window.location.pathname;
    const isProtected = protectedPages.some(p => currentPath.includes(p));
    const isLoggedIn = localStorage.getItem(SESSION_KEY);

    if (isProtected && !isLoggedIn) {
        window.location.href = 'login.html';
    }
})();

function registerUser(name, email, password) {
    const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || [];
    if (users.some(u => u.email === email)) return { success: false, message: "Email already exists!" };

    users.push({ name, email, password });
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    return { success: true };
}

function loginUser(email, password) {
    const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
        return { success: true };
    }
    return { success: false, message: "Invalid credentials" };
}

function logoutUser() {
    Swal.fire({
        title: 'Logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        confirmButtonColor: '#d33'
    }).then((r) => {
        if (r.isConfirmed) {
            localStorage.removeItem(SESSION_KEY);
            window.location.href = 'login.html';
        }
    });
}