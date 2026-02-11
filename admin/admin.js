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
        storagePrefix: 'cst_admin_',
        functionsBaseUrl: 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net'
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

    const DEFAULT_CREDENTIALS = {
        username: 'admin',
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
        const span = document.createElement('span');
        span.className = 'toast-message';
        span.textContent = message;
        toast.appendChild(span);
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

        if (username === credentials.username && passwordHash === credentials.passwordHash) {
            return true;
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
            scheduling: 'Scheduling',
            settings: 'Settings'
        };
        UI.sectionTitle.textContent = titles[sectionName] || 'Dashboard';

        // Load section data
        if (sectionName === 'courses') loadCourses();
        if (sectionName === 'testimonials') loadTestimonials();
        if (sectionName === 'contact') loadContactInfo();
        if (sectionName === 'scheduling') initScheduling();
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
            <div class="item-card" data-id="${escapeHtml(String(course.id))}">
                <div class="item-info">
                    <h3 class="item-title">${escapeHtml(course.title)}</h3>
                    <p class="item-subtitle">${escapeHtml(course.code)} - ${escapeHtml(course.badge)}</p>
                    <span class="item-price">From $${parseInt(course.price) || 0}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-outline btn-sm edit-course" data-id="${escapeHtml(String(course.id))}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-course" data-id="${escapeHtml(String(course.id))}">Delete</button>
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
            <div class="item-card" data-id="${escapeHtml(String(testimonial.id))}">
                <div class="item-info">
                    <p class="item-text">"${escapeHtml(testimonial.text.substring(0, 100))}${testimonial.text.length > 100 ? '...' : ''}"</p>
                    <p class="item-subtitle">- ${escapeHtml(testimonial.author)}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-outline btn-sm edit-testimonial" data-id="${escapeHtml(String(testimonial.id))}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-testimonial" data-id="${escapeHtml(String(testimonial.id))}">Delete</button>
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
        // Restore save button visibility (viewAppointment hides it)
        if (UI.saveModal) UI.saveModal.style.display = '';
    }

    // =====================================================
    // Settings Management
    // =====================================================

    async function changePassword(currentPassword, newPassword) {
        const credentials = getCredentials();

        // Validate current password
        const currentHash = await sha256(currentPassword);
        if (currentHash !== credentials.passwordHash) {
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
    // Acuity Scheduling Integration
    // =====================================================

    // HTML escape helper
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // Date format helper
    function formatDateISO(date) {
        return date.toISOString().split('T')[0];
    }

    // Firebase admin login (runs alongside existing localStorage auth)
    function firebaseAdminLogin(password) {
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        var adminEmail = 'admin@coralseatraining.com.au';
        firebase.auth().signInWithEmailAndPassword(adminEmail, password).catch(function(err) {
            console.warn('Firebase admin auth failed:', err.message);
        });
    }

    // Get Firebase ID token for Cloud Functions calls
    async function getFirebaseToken() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            throw new Error('Firebase not loaded');
        }
        var user = firebase.auth().currentUser;
        if (!user) throw new Error('Not authenticated with Firebase — sign in again');
        return user.getIdToken();
    }

    // Acuity API client (calls Cloud Functions proxy)
    async function acuityFetch(endpoint, options) {
        options = options || {};
        var token = await getFirebaseToken();
        var url = new URL(CONFIG.functionsBaseUrl + '/' + endpoint.replace(/^\//, ''));

        if (options.params) {
            Object.keys(options.params).forEach(function(k) {
                var v = options.params[k];
                if (v !== '' && v !== null && v !== undefined) {
                    url.searchParams.set(k, v);
                }
            });
        }

        var fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
        fetchOptions.signal = controller.signal;

        try {
            var response = await fetch(url.toString(), fetchOptions);
            clearTimeout(timeoutId);
            if (!response.ok) {
                var errData = await response.json().catch(function() { return { error: 'Request failed' }; });
                throw new Error(errData.error || 'API request failed: ' + response.status);
            }
            return response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') throw new Error('Request timed out');
            throw err;
        }
    }

    // Scheduling state
    var schedulingState = {
        appointments: [],
        appointmentTypes: [],
        clients: [],
        calendarMonth: new Date().getMonth(),
        calendarYear: new Date().getFullYear(),
        initialized: false
    };

    // Initialize scheduling section
    async function initScheduling() {
        if (schedulingState.initialized) {
            return;
        }

        try {
            // Load appointment types
            var types = await acuityFetch('getAppointmentTypes');
            schedulingState.appointmentTypes = types;

            // Populate type filter dropdown
            var typeSelect = document.getElementById('filterType');
            types.forEach(function(type) {
                var opt = document.createElement('option');
                opt.value = type.id;
                opt.textContent = type.name;
                typeSelect.appendChild(opt);
            });

            // Set default date range (today to 30 days out)
            var today = new Date();
            var thirtyOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
            document.getElementById('filterDateFrom').value = formatDateISO(today);
            document.getElementById('filterDateTo').value = formatDateISO(thirtyOut);

            schedulingState.initialized = true;

            await loadAppointments();
            loadSchedulingStats();
        } catch (err) {
            console.error('Scheduling init error:', err);
            showToast('Failed to connect to scheduling: ' + err.message, 'error');
        }
    }

    // Load and render appointments
    async function loadAppointments() {
        var fromDate = document.getElementById('filterDateFrom').value;
        var toDate = document.getElementById('filterDateTo').value;
        var typeId = document.getElementById('filterType').value;
        var status = document.getElementById('filterStatus').value;

        var params = {};
        if (fromDate) params.minDate = fromDate + 'T00:00:00';
        if (toDate) params.maxDate = toDate + 'T23:59:59';
        if (typeId) params.appointmentTypeID = typeId;
        if (status === 'canceled') params.canceled = 'true';

        try {
            var appointments = await acuityFetch('getAppointments', { params: params });
            schedulingState.appointments = appointments;
            renderAppointments();
        } catch (err) {
            showToast('Failed to load appointments: ' + err.message, 'error');
        }
    }

    function renderAppointments() {
        var container = document.getElementById('appointmentsList');
        var appointments = schedulingState.appointments;
        var statusFilter = document.getElementById('filterStatus').value;

        // Client-side status filter for completed
        if (statusFilter === 'completed') {
            var now = new Date();
            appointments = appointments.filter(function(a) {
                return !a.canceled && new Date(a.datetime) < now;
            });
        } else if (statusFilter === 'scheduled') {
            var now2 = new Date();
            appointments = appointments.filter(function(a) {
                return !a.canceled && new Date(a.datetime) >= now2;
            });
        }

        if (appointments.length === 0) {
            container.innerHTML = '<div class="empty-state">No appointments found for the selected filters.</div>';
            return;
        }

        container.innerHTML = appointments.map(function(apt) {
            var dateObj = new Date(apt.datetime);
            var dateStr = dateObj.toLocaleDateString('en-AU', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
            var timeStr = dateObj.toLocaleTimeString('en-AU', {
                hour: '2-digit', minute: '2-digit'
            });
            var statusClass = apt.canceled ? 'canceled' :
                (dateObj < new Date() ? 'completed' : 'scheduled');
            var statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);

            var actions = '<button class="btn btn-outline btn-sm view-apt" data-id="' + apt.id + '">View</button>';
            if (!apt.canceled && dateObj >= new Date()) {
                actions += ' <button class="btn btn-outline btn-sm reschedule-apt" data-id="' + apt.id + '">Reschedule</button>';
                actions += ' <button class="btn btn-danger btn-sm cancel-apt" data-id="' + apt.id + '">Cancel</button>';
            }

            return '<div class="item-card appointment-card" data-id="' + apt.id + '">' +
                '<div class="item-info">' +
                    '<h3 class="item-title">' + escapeHtml(apt.type) + '</h3>' +
                    '<p class="item-subtitle">' + escapeHtml(apt.firstName) + ' ' + escapeHtml(apt.lastName) +
                    (apt.email ? ' &mdash; ' + escapeHtml(apt.email) : '') + '</p>' +
                    '<div class="appointment-meta">' +
                        '<span class="appointment-date">' + dateStr + ' at ' + timeStr + '</span>' +
                        '<span class="appointment-status status-' + statusClass + '">' + statusLabel + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="item-actions">' + actions + '</div>' +
            '</div>';
        }).join('');

        // Attach event listeners
        container.querySelectorAll('.view-apt').forEach(function(btn) {
            btn.addEventListener('click', function() { viewAppointment(btn.dataset.id); });
        });
        container.querySelectorAll('.cancel-apt').forEach(function(btn) {
            btn.addEventListener('click', function() { cancelAppointment(btn.dataset.id); });
        });
        container.querySelectorAll('.reschedule-apt').forEach(function(btn) {
            btn.addEventListener('click', function() { showRescheduleModal(btn.dataset.id); });
        });
    }

    // View appointment detail
    async function viewAppointment(id) {
        try {
            var apt = await acuityFetch('getAppointment', { params: { id: id } });
            var dateObj = new Date(apt.datetime);

            showModal('Appointment Details', '' +
                '<div class="appointment-detail">' +
                    '<div class="form-section">' +
                        '<h3>Appointment</h3>' +
                        '<div class="detail-row"><span class="detail-label">Type:</span> ' + escapeHtml(apt.type) + '</div>' +
                        '<div class="detail-row"><span class="detail-label">Date:</span> ' + dateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
                        '<div class="detail-row"><span class="detail-label">Time:</span> ' + dateObj.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) + '</div>' +
                        '<div class="detail-row"><span class="detail-label">Duration:</span> ' + (apt.duration || 0) + ' minutes</div>' +
                        '<div class="detail-row"><span class="detail-label">Calendar:</span> ' + escapeHtml(apt.calendar || 'Default') + '</div>' +
                        '<div class="detail-row"><span class="detail-label">Status:</span> ' + (apt.canceled ? 'Cancelled' : 'Active') + '</div>' +
                    '</div>' +
                    '<div class="form-section">' +
                        '<h3>Client</h3>' +
                        '<div class="detail-row"><span class="detail-label">Name:</span> ' + escapeHtml(apt.firstName) + ' ' + escapeHtml(apt.lastName) + '</div>' +
                        '<div class="detail-row"><span class="detail-label">Email:</span> ' + escapeHtml(apt.email || 'N/A') + '</div>' +
                        '<div class="detail-row"><span class="detail-label">Phone:</span> ' + escapeHtml(apt.phone || 'N/A') + '</div>' +
                    '</div>' +
                    (apt.notes ? '<div class="form-section"><h3>Notes</h3><p>' + escapeHtml(apt.notes) + '</p></div>' : '') +
                '</div>'
            , null);

            // Hide save button for view-only modal
            UI.saveModal.style.display = 'none';
        } catch (err) {
            showToast('Failed to load appointment details', 'error');
        }
    }

    // Cancel appointment
    async function cancelAppointment(id) {
        if (!confirm('Cancel this appointment? The client will be notified by Acuity.')) return;

        try {
            await acuityFetch('cancelAppointment', { method: 'PUT', params: { id: id } });
            showToast('Appointment cancelled');
            await loadAppointments();
            loadSchedulingStats();
        } catch (err) {
            showToast('Failed to cancel: ' + err.message, 'error');
        }
    }

    // Reschedule modal
    async function showRescheduleModal(id) {
        var apt = schedulingState.appointments.find(function(a) { return a.id == id; });
        if (!apt) return;

        var currentDate = new Date(apt.datetime);
        var currentDateStr = currentDate.toLocaleDateString('en-AU') + ' at ' +
            currentDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

        showModal('Reschedule Appointment', '' +
            '<form id="rescheduleForm">' +
                '<p style="margin-bottom:1rem">Current: <strong>' + currentDateStr + '</strong></p>' +
                '<div class="form-group">' +
                    '<label for="rescheduleDate">New Date</label>' +
                    '<input type="date" id="rescheduleDate" required min="' + formatDateISO(new Date()) + '">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label for="rescheduleTime">Available Times</label>' +
                    '<select id="rescheduleTime" required>' +
                        '<option value="">Select a date first</option>' +
                    '</select>' +
                '</div>' +
            '</form>'
        , async function() {
            var datetime = document.getElementById('rescheduleTime').value;
            if (!datetime) { showToast('Please select a time', 'error'); return; }

            try {
                await acuityFetch('rescheduleAppointment', {
                    method: 'PUT',
                    params: { id: id },
                    body: { datetime: datetime }
                });
                showToast('Appointment rescheduled');
                hideModal();
                await loadAppointments();
                loadSchedulingStats();
            } catch (err) {
                showToast('Reschedule failed: ' + err.message, 'error');
            }
        });

        // Make save button visible again (viewAppointment hides it)
        UI.saveModal.style.display = '';

        // Load times when date changes
        document.getElementById('rescheduleDate').addEventListener('change', async function() {
            var date = this.value;
            var timeSelect = document.getElementById('rescheduleTime');
            timeSelect.innerHTML = '<option value="">Loading...</option>';

            try {
                var times = await acuityFetch('getAvailableTimes', {
                    params: { date: date, appointmentTypeID: apt.appointmentTypeID }
                });
                if (times.length === 0) {
                    timeSelect.innerHTML = '<option value="">No availability</option>';
                } else {
                    timeSelect.innerHTML = times.map(function(t) {
                        var d = new Date(t.time);
                        return '<option value="' + t.time + '">' +
                            d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) +
                        '</option>';
                    }).join('');
                }
            } catch (err) {
                timeSelect.innerHTML = '<option value="">Error loading times</option>';
            }
        });
    }

    // Quick stats
    async function loadSchedulingStats() {
        var today = new Date();
        var todayStr = formatDateISO(today);
        var weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
        var monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        try {
            var results = await Promise.all([
                acuityFetch('getAppointments', { params: { minDate: todayStr + 'T00:00:00', maxDate: todayStr + 'T23:59:59' } }),
                acuityFetch('getAppointments', { params: { minDate: todayStr + 'T00:00:00', maxDate: formatDateISO(weekEnd) + 'T23:59:59' } }),
                acuityFetch('getAppointments', { params: { minDate: todayStr + 'T00:00:00', maxDate: formatDateISO(monthEnd) + 'T23:59:59' } })
            ]);

            document.getElementById('schedulingToday').textContent = results[0].length;
            document.getElementById('schedulingWeek').textContent = results[1].length;
            document.getElementById('schedulingMonth').textContent = results[2].length;
            document.getElementById('schedulingTypes').textContent = schedulingState.appointmentTypes.length;
        } catch (err) {
            console.error('Stats load error:', err);
        }
    }

    // Calendar view
    async function renderCalendar() {
        var year = schedulingState.calendarYear;
        var month = schedulingState.calendarMonth;

        document.getElementById('calMonthYear').textContent =
            new Date(year, month).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

        var firstDay = new Date(year, month, 1);
        var lastDay = new Date(year, month + 1, 0);

        try {
            var apts = await acuityFetch('getAppointments', {
                params: {
                    minDate: formatDateISO(firstDay) + 'T00:00:00',
                    maxDate: formatDateISO(lastDay) + 'T23:59:59'
                }
            });

            // Group by date
            var aptsByDate = {};
            apts.forEach(function(apt) {
                var dateKey = apt.datetime.split('T')[0];
                if (!aptsByDate[dateKey]) aptsByDate[dateKey] = [];
                aptsByDate[dateKey].push(apt);
            });

            var grid = document.getElementById('calendarGrid');
            var html = '<div class="calendar-header-row">';
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function(d) {
                html += '<div class="calendar-day-header">' + d + '</div>';
            });
            html += '</div>';

            var startDay = firstDay.getDay();
            html += '<div class="calendar-body-row">';
            for (var i = 0; i < startDay; i++) {
                html += '<div class="calendar-cell empty"></div>';
            }

            for (var d = 1; d <= lastDay.getDate(); d++) {
                var dateKey = formatDateISO(new Date(year, month, d));
                var dayApts = aptsByDate[dateKey] || [];
                var isToday = dateKey === formatDateISO(new Date());

                html += '<div class="calendar-cell' + (isToday ? ' today' : '') + (dayApts.length > 0 ? ' has-appointments' : '') + '">';
                html += '<span class="calendar-date">' + d + '</span>';

                if (dayApts.length > 0) {
                    html += '<span class="calendar-count">' + dayApts.length + ' apt' + (dayApts.length > 1 ? 's' : '') + '</span>';
                    dayApts.slice(0, 2).forEach(function(apt) {
                        var time = new Date(apt.datetime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
                        html += '<div class="calendar-apt-preview">' + time + ' ' + escapeHtml(apt.firstName) + '</div>';
                    });
                    if (dayApts.length > 2) {
                        html += '<div class="calendar-apt-more">+' + (dayApts.length - 2) + ' more</div>';
                    }
                }

                html += '</div>';

                if ((startDay + d) % 7 === 0 && d < lastDay.getDate()) {
                    html += '</div><div class="calendar-body-row">';
                }
            }
            html += '</div>';

            grid.innerHTML = html;
        } catch (err) {
            showToast('Failed to load calendar: ' + err.message, 'error');
        }
    }

    // Client list
    async function loadClients() {
        try {
            var clients = await acuityFetch('getClients');
            schedulingState.clients = clients;
            renderClients();
        } catch (err) {
            showToast('Failed to load clients: ' + err.message, 'error');
        }
    }

    function renderClients(filter) {
        var container = document.getElementById('clientsList');
        var clients = schedulingState.clients;

        if (filter) {
            var q = filter.toLowerCase();
            clients = clients.filter(function(c) {
                return ((c.firstName || '') + ' ' + (c.lastName || '')).toLowerCase().indexOf(q) !== -1 ||
                    (c.email || '').toLowerCase().indexOf(q) !== -1 ||
                    (c.phone || '').toLowerCase().indexOf(q) !== -1;
            });
        }

        if (clients.length === 0) {
            container.innerHTML = '<div class="empty-state">' + (filter ? 'No clients matching "' + escapeHtml(filter) + '".' : 'No clients found.') + '</div>';
            return;
        }

        container.innerHTML = clients.map(function(c) {
            return '<div class="item-card">' +
                '<div class="item-info">' +
                    '<h3 class="item-title">' + escapeHtml(c.firstName) + ' ' + escapeHtml(c.lastName) + '</h3>' +
                    '<p class="item-subtitle">' + escapeHtml(c.email || 'No email') + (c.phone ? ' | ' + escapeHtml(c.phone) : '') + '</p>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    // Scheduling event listeners
    function initSchedulingListeners() {
        var applyBtn = document.getElementById('applyFilters');
        var refreshBtn = document.getElementById('refreshAppointments');
        var refreshClientsBtn = document.getElementById('refreshClients');

        if (applyBtn) applyBtn.addEventListener('click', loadAppointments);
        if (refreshBtn) refreshBtn.addEventListener('click', loadAppointments);
        if (refreshClientsBtn) refreshClientsBtn.addEventListener('click', loadClients);

        // Sub-tabs
        document.querySelectorAll('.scheduling-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.scheduling-tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.scheduling-subtab').forEach(function(s) { s.classList.remove('active'); });
                tab.classList.add('active');

                var subtabName = tab.dataset.subtab;
                var subtabEl = document.getElementById('scheduling' + subtabName.charAt(0).toUpperCase() + subtabName.slice(1));
                if (subtabEl) subtabEl.classList.add('active');

                if (subtabName === 'calendar') renderCalendar();
                if (subtabName === 'clients') loadClients();
            });
        });

        // Calendar navigation
        var calPrev = document.getElementById('calPrev');
        var calNext = document.getElementById('calNext');

        if (calPrev) calPrev.addEventListener('click', function() {
            schedulingState.calendarMonth--;
            if (schedulingState.calendarMonth < 0) {
                schedulingState.calendarMonth = 11;
                schedulingState.calendarYear--;
            }
            renderCalendar();
        });

        if (calNext) calNext.addEventListener('click', function() {
            schedulingState.calendarMonth++;
            if (schedulingState.calendarMonth > 11) {
                schedulingState.calendarMonth = 0;
                schedulingState.calendarYear++;
            }
            renderCalendar();
        });

        // Client search
        var clientSearch = document.getElementById('clientSearch');
        if (clientSearch) {
            clientSearch.addEventListener('input', function() {
                renderClients(this.value);
            });
        }
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
                // Also sign into Firebase for Cloud Functions auth
                firebaseAdminLogin(password);
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
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut().catch(function() {});
            }
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

        // Scheduling event listeners
        initSchedulingListeners();
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
