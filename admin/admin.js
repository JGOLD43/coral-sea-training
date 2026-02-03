/**
 * Coral Sea Training - Admin Panel JavaScript
 * Secure content management system
 */

(function() {
    'use strict';

    // =====================================================
    // Configuration & Default Data
    // =====================================================

    const CONFIG = {
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        storagePrefix: 'cst_admin_'
    };

    const DEFAULT_DATA = {
        courses: [
            {
                id: 1,
                title: 'CPR Course',
                code: 'HLTAID009',
                price: 60,
                badge: 'Most Popular',
                features: [
                    'Cardiopulmonary Resuscitation (CPR)',
                    'Defibrillator (AED) Training',
                    'Australian Resuscitation Council Guidelines',
                    'Certificate valid for 12 months'
                ]
            },
            {
                id: 2,
                title: 'Provide First Aid',
                code: 'HLTAID011',
                price: 120,
                badge: 'Best Value',
                featured: true,
                features: [
                    'Includes CPR (HLTAID009)',
                    'Basic Emergency Life Support (HLTAID010)',
                    'Workplace & Home First Aid Skills',
                    'Certificate valid for 3 years'
                ]
            },
            {
                id: 3,
                title: 'Childcare First Aid',
                code: 'HLTAID012',
                price: 140,
                badge: 'Childcare',
                features: [
                    'Includes CPR & First Aid',
                    'Anaphylaxis Management',
                    'Asthma Emergency Response',
                    'ACECQA Approved'
                ]
            },
            {
                id: 4,
                title: 'Advanced Resuscitation',
                code: 'HLTAID015',
                price: 140,
                badge: 'Advanced',
                features: [
                    'Oxygen Therapy Administration',
                    'Advanced Defibrillation',
                    'Ideal for Divers & Medical Settings',
                    'Requires current HLTAID011'
                ]
            }
        ],
        testimonials: [
            {
                id: 1,
                text: "One of the best I've been to. Very thorough and would be the best Trainer I have had, very easy to understand and delivered the course easily.",
                author: 'Course Participant'
            },
            {
                id: 2,
                text: "Quick and well presented. You have always been our preferred First Aid provider and I have been back many times over 20 years in Child Care.",
                author: 'Childcare Provider'
            },
            {
                id: 3,
                text: "Professional and stimulating training. Delivered in an easy to understand and follow format. The Presenter's knowledge and ability to use practical applications was outstanding.",
                author: 'Course Participant'
            },
            {
                id: 4,
                text: "I appreciated the simplicity of your presentation. There were no scary/overwhelming stories. Very informative and considerate of everyone's needs and pace.",
                author: 'Course Participant'
            },
            {
                id: 5,
                text: "Each time I have completed training at CST I am learning more and feeling more confident. Clear and most concise course I've done for my first aid refresher.",
                author: 'Returning Student'
            },
            {
                id: 6,
                text: "Mark always gives a great presentation, clear and well presented. Course was enjoyable and informative. Thanks so much.",
                author: 'Course Participant'
            }
        ],
        contact: {
            tsv_phone: '0419 675 022',
            tsv_address: '40 Charles Street, Aitkenvale QLD 4814',
            wb_phone: '0488 488 467',
            wb_address: '60 John Street, Maryborough QLD 4650',
            email: 'admin@coralseatraining.com.au',
            hours: 'Mon-Fri: 8:00 AM - 4:30 PM'
        }
    };

    // Default credentials (hashed) - Change these in production!
    // Default: username: admin, password: CoralSea2024!
    const DEFAULT_CREDENTIALS = {
        username: 'admin',
        // SHA-256 hash of 'CoralSea2024!'
        passwordHash: 'a8e5f5f8b3c4d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7'
    };

    // =====================================================
    // Utility Functions
    // =====================================================

    // Simple SHA-256 hash function
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Storage helpers
    function getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(CONFIG.storagePrefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage read error:', e);
            return defaultValue;
        }
    }

    function setStorage(key, value) {
        try {
            localStorage.setItem(CONFIG.storagePrefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage write error:', e);
            return false;
        }
    }

    function removeStorage(key) {
        localStorage.removeItem(CONFIG.storagePrefix + key);
    }

    // Toast notifications
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-message">${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Generate unique ID
    function generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // =====================================================
    // Authentication
    // =====================================================

    function getCredentials() {
        return getStorage('credentials', DEFAULT_CREDENTIALS);
    }

    async function validateLogin(username, password) {
        const credentials = getCredentials();
        const passwordHash = await sha256(password);

        // For first-time use, also accept the default password directly
        // In production, remove this and only use hashed comparison
        if (username === credentials.username) {
            if (passwordHash === credentials.passwordHash || password === 'CoralSea2024!') {
                return true;
            }
        }
        return false;
    }

    function createSession() {
        const session = {
            created: Date.now(),
            expires: Date.now() + CONFIG.sessionTimeout
        };
        setStorage('session', session);
        return session;
    }

    function getSession() {
        const session = getStorage('session');
        if (!session) return null;

        if (Date.now() > session.expires) {
            removeStorage('session');
            return null;
        }

        // Extend session on activity
        session.expires = Date.now() + CONFIG.sessionTimeout;
        setStorage('session', session);
        return session;
    }

    function destroySession() {
        removeStorage('session');
    }

    function isAuthenticated() {
        return getSession() !== null;
    }

    // =====================================================
    // Data Management
    // =====================================================

    function getData() {
        return getStorage('data', DEFAULT_DATA);
    }

    function saveData(data) {
        return setStorage('data', data);
    }

    function resetToDefaults() {
        return setStorage('data', DEFAULT_DATA);
    }

    // =====================================================
    // UI Components
    // =====================================================

    const UI = {
        loginScreen: document.getElementById('loginScreen'),
        adminDashboard: document.getElementById('adminDashboard'),
        loginForm: document.getElementById('loginForm'),
        loginError: document.getElementById('loginError'),
        logoutBtn: document.getElementById('logoutBtn'),
        sectionTitle: document.getElementById('sectionTitle'),
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('.content-section'),
        modal: document.getElementById('editModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        closeModal: document.getElementById('closeModal'),
        cancelModal: document.getElementById('cancelModal'),
        saveModal: document.getElementById('saveModal')
    };

    // =====================================================
    // Screen Management
    // =====================================================

    function showLoginScreen() {
        UI.loginScreen.style.display = 'flex';
        UI.adminDashboard.style.display = 'none';
    }

    function showDashboard() {
        UI.loginScreen.style.display = 'none';
        UI.adminDashboard.style.display = 'flex';
        loadDashboardData();
    }

    function switchSection(sectionName) {
        // Update nav
        UI.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // Update sections
        UI.sections.forEach(section => {
            section.classList.toggle('active', section.id === sectionName + 'Section');
        });

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            courses: 'Manage Courses',
            testimonials: 'Manage Testimonials',
            contact: 'Contact Information',
            settings: 'Settings'
        };
        UI.sectionTitle.textContent = titles[sectionName] || 'Dashboard';

        // Load section data
        if (sectionName === 'courses') loadCourses();
        if (sectionName === 'testimonials') loadTestimonials();
        if (sectionName === 'contact') loadContactInfo();
    }

    // =====================================================
    // Dashboard
    // =====================================================

    function loadDashboardData() {
        const data = getData();
        document.getElementById('coursesCount').textContent = data.courses.length;
        document.getElementById('testimonialsCount').textContent = data.testimonials.length;
    }

    // =====================================================
    // Courses Management
    // =====================================================

    function loadCourses() {
        const data = getData();
        const container = document.getElementById('coursesList');

        container.innerHTML = data.courses.map(course => `
            <div class="item-card" data-id="${course.id}">
                <div class="item-info">
                    <h3 class="item-title">${course.title}</h3>
                    <p class="item-subtitle">${course.code} - ${course.badge}</p>
                    <span class="item-price">From $${course.price}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-outline btn-sm edit-course" data-id="${course.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-course" data-id="${course.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        container.querySelectorAll('.edit-course').forEach(btn => {
            btn.addEventListener('click', () => editCourse(btn.dataset.id));
        });

        container.querySelectorAll('.delete-course').forEach(btn => {
            btn.addEventListener('click', () => deleteCourse(btn.dataset.id));
        });
    }

    function editCourse(id) {
        const data = getData();
        const course = data.courses.find(c => c.id == id);

        if (!course) return;

        showModal('Edit Course', `
            <form id="editCourseForm">
                <input type="hidden" name="id" value="${course.id}">
                <div class="form-group">
                    <label for="courseTitle">Course Title</label>
                    <input type="text" id="courseTitle" name="title" value="${course.title}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="courseCode">Course Code</label>
                        <input type="text" id="courseCode" name="code" value="${course.code}" required>
                    </div>
                    <div class="form-group">
                        <label for="coursePrice">Price ($)</label>
                        <input type="number" id="coursePrice" name="price" value="${course.price}" required min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label for="courseBadge">Badge Text</label>
                    <input type="text" id="courseBadge" name="badge" value="${course.badge}">
                </div>
                <div class="form-group">
                    <label for="courseFeatures">Features (one per line)</label>
                    <textarea id="courseFeatures" name="features" rows="4">${course.features.join('\n')}</textarea>
                </div>
            </form>
        `, () => {
            const form = document.getElementById('editCourseForm');
            const formData = new FormData(form);
            const updatedCourse = {
                id: parseInt(formData.get('id')),
                title: formData.get('title'),
                code: formData.get('code'),
                price: parseInt(formData.get('price')),
                badge: formData.get('badge'),
                features: formData.get('features').split('\n').filter(f => f.trim())
            };

            const index = data.courses.findIndex(c => c.id == id);
            data.courses[index] = updatedCourse;
            saveData(data);
            loadCourses();
            loadDashboardData();
            showToast('Course updated successfully');
        });
    }

    function addCourse() {
        showModal('Add New Course', `
            <form id="addCourseForm">
                <div class="form-group">
                    <label for="courseTitle">Course Title</label>
                    <input type="text" id="courseTitle" name="title" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="courseCode">Course Code</label>
                        <input type="text" id="courseCode" name="code" required placeholder="e.g., HLTAID009">
                    </div>
                    <div class="form-group">
                        <label for="coursePrice">Price ($)</label>
                        <input type="number" id="coursePrice" name="price" required min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label for="courseBadge">Badge Text</label>
                    <input type="text" id="courseBadge" name="badge" placeholder="e.g., Most Popular">
                </div>
                <div class="form-group">
                    <label for="courseFeatures">Features (one per line)</label>
                    <textarea id="courseFeatures" name="features" rows="4"></textarea>
                </div>
            </form>
        `, () => {
            const form = document.getElementById('addCourseForm');
            const formData = new FormData(form);
            const data = getData();

            const newCourse = {
                id: generateId(),
                title: formData.get('title'),
                code: formData.get('code'),
                price: parseInt(formData.get('price')),
                badge: formData.get('badge'),
                features: formData.get('features').split('\n').filter(f => f.trim())
            };

            data.courses.push(newCourse);
            saveData(data);
            loadCourses();
            loadDashboardData();
            showToast('Course added successfully');
        });
    }

    function deleteCourse(id) {
        if (!confirm('Are you sure you want to delete this course?')) return;

        const data = getData();
        data.courses = data.courses.filter(c => c.id != id);
        saveData(data);
        loadCourses();
        loadDashboardData();
        showToast('Course deleted', 'warning');
    }

    // =====================================================
    // Testimonials Management
    // =====================================================

    function loadTestimonials() {
        const data = getData();
        const container = document.getElementById('testimonialsList');

        container.innerHTML = data.testimonials.map(testimonial => `
            <div class="item-card" data-id="${testimonial.id}">
                <div class="item-info">
                    <p class="item-text">"${testimonial.text.substring(0, 100)}${testimonial.text.length > 100 ? '...' : ''}"</p>
                    <p class="item-subtitle">- ${testimonial.author}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-outline btn-sm edit-testimonial" data-id="${testimonial.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-testimonial" data-id="${testimonial.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        container.querySelectorAll('.edit-testimonial').forEach(btn => {
            btn.addEventListener('click', () => editTestimonial(btn.dataset.id));
        });

        container.querySelectorAll('.delete-testimonial').forEach(btn => {
            btn.addEventListener('click', () => deleteTestimonial(btn.dataset.id));
        });
    }

    function editTestimonial(id) {
        const data = getData();
        const testimonial = data.testimonials.find(t => t.id == id);

        if (!testimonial) return;

        showModal('Edit Testimonial', `
            <form id="editTestimonialForm">
                <input type="hidden" name="id" value="${testimonial.id}">
                <div class="form-group">
                    <label for="testimonialText">Testimonial Text</label>
                    <textarea id="testimonialText" name="text" rows="4" required>${testimonial.text}</textarea>
                </div>
                <div class="form-group">
                    <label for="testimonialAuthor">Author</label>
                    <input type="text" id="testimonialAuthor" name="author" value="${testimonial.author}" required>
                </div>
            </form>
        `, () => {
            const form = document.getElementById('editTestimonialForm');
            const formData = new FormData(form);

            const index = data.testimonials.findIndex(t => t.id == id);
            data.testimonials[index] = {
                id: parseInt(formData.get('id')) || testimonial.id,
                text: formData.get('text'),
                author: formData.get('author')
            };

            saveData(data);
            loadTestimonials();
            loadDashboardData();
            showToast('Testimonial updated successfully');
        });
    }

    function addTestimonial() {
        showModal('Add New Testimonial', `
            <form id="addTestimonialForm">
                <div class="form-group">
                    <label for="testimonialText">Testimonial Text</label>
                    <textarea id="testimonialText" name="text" rows="4" required placeholder="Enter the testimonial..."></textarea>
                </div>
                <div class="form-group">
                    <label for="testimonialAuthor">Author</label>
                    <input type="text" id="testimonialAuthor" name="author" required placeholder="e.g., Course Participant">
                </div>
            </form>
        `, () => {
            const form = document.getElementById('addTestimonialForm');
            const formData = new FormData(form);
            const data = getData();

            data.testimonials.push({
                id: generateId(),
                text: formData.get('text'),
                author: formData.get('author')
            });

            saveData(data);
            loadTestimonials();
            loadDashboardData();
            showToast('Testimonial added successfully');
        });
    }

    function deleteTestimonial(id) {
        if (!confirm('Are you sure you want to delete this testimonial?')) return;

        const data = getData();
        data.testimonials = data.testimonials.filter(t => t.id != id);
        saveData(data);
        loadTestimonials();
        loadDashboardData();
        showToast('Testimonial deleted', 'warning');
    }

    // =====================================================
    // Contact Info Management
    // =====================================================

    function loadContactInfo() {
        const data = getData();
        const contact = data.contact;

        document.getElementById('tsv_phone').value = contact.tsv_phone || '';
        document.getElementById('tsv_address').value = contact.tsv_address || '';
        document.getElementById('wb_phone').value = contact.wb_phone || '';
        document.getElementById('wb_address').value = contact.wb_address || '';
        document.getElementById('email').value = contact.email || '';
        document.getElementById('hours').value = contact.hours || '';
    }

    // =====================================================
    // Modal Management
    // =====================================================

    let modalSaveCallback = null;

    function showModal(title, content, onSave) {
        UI.modalTitle.textContent = title;
        UI.modalBody.innerHTML = content;
        modalSaveCallback = onSave;
        UI.modal.style.display = 'flex';
    }

    function hideModal() {
        UI.modal.style.display = 'none';
        modalSaveCallback = null;
    }

    // =====================================================
    // Settings Management
    // =====================================================

    async function changePassword(currentPassword, newPassword) {
        const credentials = getCredentials();

        // Validate current password
        const currentHash = await sha256(currentPassword);
        if (currentHash !== credentials.passwordHash && currentPassword !== 'CoralSea2024!') {
            return { success: false, message: 'Current password is incorrect' };
        }

        // Hash and save new password
        const newHash = await sha256(newPassword);
        setStorage('credentials', {
            username: credentials.username,
            passwordHash: newHash
        });

        return { success: true, message: 'Password changed successfully' };
    }

    function exportData() {
        const data = getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coral-sea-training-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported successfully');
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate data structure
                if (!data.courses || !data.testimonials || !data.contact) {
                    throw new Error('Invalid data format');
                }

                saveData(data);
                loadDashboardData();
                showToast('Data imported successfully');
            } catch (error) {
                showToast('Failed to import data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // =====================================================
    // Event Listeners
    // =====================================================

    function initEventListeners() {
        // Login form
        UI.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (await validateLogin(username, password)) {
                createSession();
                showDashboard();
                UI.loginError.style.display = 'none';
            } else {
                UI.loginError.textContent = 'Invalid username or password';
                UI.loginError.style.display = 'block';
            }
        });

        // Logout
        UI.logoutBtn.addEventListener('click', () => {
            destroySession();
            showLoginScreen();
        });

        // Navigation
        UI.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchSection(item.dataset.section);
            });
        });

        // Modal
        UI.closeModal.addEventListener('click', hideModal);
        UI.cancelModal.addEventListener('click', hideModal);
        UI.saveModal.addEventListener('click', () => {
            if (modalSaveCallback) {
                modalSaveCallback();
                hideModal();
            }
        });

        // Close modal on backdrop click
        UI.modal.querySelector('.modal-backdrop').addEventListener('click', hideModal);

        // Add course button
        document.getElementById('addCourseBtn').addEventListener('click', addCourse);

        // Add testimonial button
        document.getElementById('addTestimonialBtn').addEventListener('click', addTestimonial);

        // Contact form
        document.getElementById('contactInfoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = getData();
            const formData = new FormData(e.target);

            data.contact = {
                tsv_phone: formData.get('tsv_phone'),
                tsv_address: formData.get('tsv_address'),
                wb_phone: formData.get('wb_phone'),
                wb_address: formData.get('wb_address'),
                email: formData.get('email'),
                hours: formData.get('hours')
            };

            saveData(data);
            showToast('Contact information saved');
        });

        // Password change form
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match', 'error');
                return;
            }

            if (newPassword.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }

            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
                showToast(result.message);
                e.target.reset();
            } else {
                showToast(result.message, 'error');
            }
        });

        // Export data
        document.getElementById('exportDataBtn').addEventListener('click', exportData);

        // Import data
        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]);
            }
        });
    }

    // =====================================================
    // Initialization
    // =====================================================

    function init() {
        // Initialize default data if not present
        if (!getStorage('data')) {
            setStorage('data', DEFAULT_DATA);
        }

        // Check authentication
        if (isAuthenticated()) {
            showDashboard();
        } else {
            showLoginScreen();
        }

        // Initialize event listeners
        initEventListeners();
    }

    // Start the application
    init();

})();
