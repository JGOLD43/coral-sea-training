/**
 * Coral Sea Training - Partner Portal JavaScript
 * Dashboard, employee management, bookings, compliance tracking
 */

var Portal = (function() {
    'use strict';

    // =====================================================
    // State
    // =====================================================

    var currentUser = null;
    var partnerData = null;
    var employees = [];
    var bookings = [];
    var coursePricing = [];
    var currentSection = 'dashboard';

    // Booking flow state
    var bookingState = {
        course: null,
        selectedEmployees: [],
        date: '',
        location: ''
    };

    // Default course pricing (used if Firestore coursePricing collection is empty)
    var defaultCourses = [
        { id: 'cpr', name: 'CPR Course', code: 'HLTAID009', basePrice: 60, category: 'cpr' },
        { id: 'firstaid', name: 'Provide First Aid', code: 'HLTAID011', basePrice: 120, category: 'first-aid' },
        { id: 'childcare', name: 'Childcare First Aid', code: 'HLTAID012', basePrice: 140, category: 'childcare' },
        { id: 'advanced', name: 'Advanced Resuscitation', code: 'HLTAID015', basePrice: 140, category: 'advanced' }
    ];

    // Modal callback
    var modalSaveCallback = null;

    // =====================================================
    // Initialization
    // =====================================================

    function init() {
        auth.onAuthStateChanged(function(user) {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            currentUser = user;
            loadPartnerData();
        });

        initEventListeners();
    }

    function loadPartnerData() {
        var uid = currentUser.uid;

        // Load partner profile
        db.collection('partners').doc(uid).get()
            .then(function(doc) {
                if (!doc.exists) {
                    // Create a default document if it doesn't exist (edge case)
                    return db.collection('partners').doc(uid).set({
                        businessName: 'My Business',
                        contactName: currentUser.displayName || '',
                        email: currentUser.email,
                        phone: '',
                        abn: '',
                        discountTier: 'silver',
                        discountPercent: 10,
                        status: 'pending',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(function() {
                        return db.collection('partners').doc(uid).get();
                    });
                }
                return doc;
            })
            .then(function(doc) {
                partnerData = doc.data();
                updateUI();
                loadEmployees();
                loadBookings();
                loadCoursePricing();
                showApp();
            })
            .catch(function(err) {
                console.error('Failed to load partner data:', err);
                showToast('Failed to load data. Please refresh.', 'error');
                showApp();
            });
    }

    function showApp() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('portalApp').style.display = 'flex';
    }

    // =====================================================
    // UI Updates
    // =====================================================

    function updateUI() {
        if (!partnerData) return;

        // User info in sidebar
        var initial = (partnerData.businessName || '?').charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initial;
        document.getElementById('userDisplayName').textContent = partnerData.businessName || 'Partner';
        document.getElementById('userDisplayEmail').textContent = partnerData.email || '';

        // Pending banner
        document.getElementById('pendingBanner').style.display =
            partnerData.status === 'pending' ? 'flex' : 'none';

        // Profile form
        document.getElementById('profileBusiness').value = partnerData.businessName || '';
        document.getElementById('profileName').value = partnerData.contactName || '';
        document.getElementById('profileABN').value = partnerData.abn || '';
        document.getElementById('profileEmail').value = partnerData.email || '';
        document.getElementById('profilePhone').value = partnerData.phone || '';

        // Tier display
        var tier = partnerData.discountTier || 'silver';
        var discount = partnerData.discountPercent || 10;
        var tierBadge = document.getElementById('tierBadge');
        tierBadge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
        tierBadge.className = 'portal-tier-badge ' + tier;
        document.getElementById('tierDiscount').textContent = discount + '%';
    }

    function updateDashboardStats() {
        var now = new Date();
        var thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        var totalCerts = 0;
        var validCerts = 0;
        var expiringCount = 0;
        var expiredCount = 0;

        employees.forEach(function(emp) {
            var certs = emp.certifications || [];
            certs.forEach(function(cert) {
                totalCerts++;
                var expiry = cert.expiryDate ? new Date(cert.expiryDate) : null;
                if (!expiry) return;
                if (expiry < now) {
                    expiredCount++;
                } else if (expiry <= thirtyDays) {
                    expiringCount++;
                    validCerts++;
                } else {
                    validCerts++;
                }
            });
        });

        document.getElementById('statEmployees').textContent = employees.length;
        document.getElementById('statExpiring').textContent = expiringCount;
        document.getElementById('statExpired').textContent = expiredCount;

        var complianceRate = totalCerts > 0 ? Math.round((validCerts / totalCerts) * 100) : (employees.length > 0 ? 0 : 100);
        document.getElementById('statCompliance').textContent = complianceRate + '%';

        // Compliance alerts
        renderDashboardAlerts();
        renderDashboardBookings();
    }

    function renderDashboardAlerts() {
        var container = document.getElementById('dashboardAlerts');
        var now = new Date();
        var thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        var alerts = [];

        employees.forEach(function(emp) {
            var certs = emp.certifications || [];
            certs.forEach(function(cert) {
                var expiry = cert.expiryDate ? new Date(cert.expiryDate) : null;
                if (!expiry) return;
                if (expiry < now) {
                    alerts.push({ name: emp.name, cert: cert.courseName, status: 'expired', date: expiry, dot: 'red' });
                } else if (expiry <= thirtyDays) {
                    alerts.push({ name: emp.name, cert: cert.courseName, status: 'expiring', date: expiry, dot: 'amber' });
                }
            });
        });

        if (alerts.length === 0) {
            container.innerHTML = '<div class="portal-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><h3>All Clear</h3><p>No compliance alerts at this time.</p></div>';
            return;
        }

        // Sort: expired first, then by date
        alerts.sort(function(a, b) {
            if (a.status === 'expired' && b.status !== 'expired') return -1;
            if (a.status !== 'expired' && b.status === 'expired') return 1;
            return a.date - b.date;
        });

        var html = '<div class="portal-alert-list">';
        alerts.slice(0, 8).forEach(function(alert) {
            html += '<div class="portal-alert-item">';
            html += '<span class="portal-alert-dot ' + alert.dot + '"></span>';
            html += '<span><span class="portal-alert-name">' + escapeHtml(alert.name) + '</span> &mdash; ' + escapeHtml(alert.cert) + '</span>';
            html += '<span class="portal-alert-detail">' + (alert.status === 'expired' ? 'Expired ' : 'Expires ') + formatDate(alert.date) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function renderDashboardBookings() {
        var container = document.getElementById('dashboardBookings');
        if (bookings.length === 0) {
            container.innerHTML = '<div class="portal-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><h3>No Bookings Yet</h3><p>Book training for your team to get started.</p><button class="portal-btn portal-btn-primary" onclick="Portal.switchSection(\'book\')">Book Training</button></div>';
            return;
        }

        var recent = bookings.slice(0, 5);
        var html = '<div class="portal-alert-list">';
        recent.forEach(function(b) {
            var statusClass = b.status || 'pending';
            html += '<div class="portal-alert-item">';
            html += '<span class="status-badge ' + statusClass + '">' + statusClass.charAt(0).toUpperCase() + statusClass.slice(1) + '</span>';
            html += '<span><strong>' + escapeHtml(b.courseName) + '</strong> &mdash; ' + (b.employees ? b.employees.length : 0) + ' employee(s)</span>';
            html += '<span class="portal-alert-detail">' + (b.courseDate || 'TBD') + '</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // =====================================================
    // Section Navigation
    // =====================================================

    var sectionTitles = {
        dashboard: 'Dashboard',
        employees: 'Employees',
        book: 'Book Training',
        bookings: 'Bookings',
        profile: 'Profile'
    };

    function switchSection(name) {
        currentSection = name;

        // Update nav
        document.querySelectorAll('.portal-nav-item').forEach(function(item) {
            item.classList.toggle('active', item.dataset.section === name);
        });

        // Update sections
        document.querySelectorAll('.portal-section').forEach(function(sec) {
            sec.classList.remove('active');
        });
        var sectionEl = document.getElementById('section' + name.charAt(0).toUpperCase() + name.slice(1));
        if (sectionEl) sectionEl.classList.add('active');

        // Update title
        document.getElementById('portalPageTitle').textContent = sectionTitles[name] || 'Dashboard';

        // Close mobile sidebar
        closeMobileSidebar();

        // Section-specific refresh
        if (name === 'dashboard') updateDashboardStats();
        if (name === 'employees') renderEmployees();
        if (name === 'book') initBookingFlow();
        if (name === 'bookings') renderBookings();
    }

    // =====================================================
    // Employee Management
    // =====================================================

    function loadEmployees() {
        var uid = currentUser.uid;
        db.collection('partners').doc(uid).collection('employees')
            .orderBy('name')
            .get()
            .then(function(snapshot) {
                employees = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    employees.push(data);
                });
                updateDashboardStats();
                if (currentSection === 'employees') renderEmployees();
            })
            .catch(function(err) {
                console.error('Failed to load employees:', err);
            });
    }

    function renderEmployees(filter) {
        var container = document.getElementById('employeeTableContainer');
        var filtered = employees;

        if (filter) {
            var q = filter.toLowerCase();
            filtered = employees.filter(function(emp) {
                return (emp.name || '').toLowerCase().indexOf(q) !== -1 ||
                       (emp.email || '').toLowerCase().indexOf(q) !== -1 ||
                       (emp.role || '').toLowerCase().indexOf(q) !== -1;
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="portal-empty" style="padding:var(--space-8);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><h3>' + (filter ? 'No matches found' : 'No Employees Yet') + '</h3><p>' + (filter ? 'Try a different search term.' : 'Add your first team member to start tracking compliance.') + '</p></div>';
            return;
        }

        var now = new Date();
        var thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        var html = '<div class="portal-table-wrapper"><table class="portal-table">';
        html += '<thead><tr><th>Name</th><th>Role</th><th>Certifications</th><th>Status</th><th>Actions</th></tr></thead>';
        html += '<tbody>';

        filtered.forEach(function(emp) {
            var certs = emp.certifications || [];
            var worstStatus = 'valid';
            var certSummary = certs.length === 0 ? '<span style="color:var(--gray-400);">None</span>' : '';

            certs.forEach(function(cert) {
                var expiry = cert.expiryDate ? new Date(cert.expiryDate) : null;
                var status = 'valid';
                if (expiry && expiry < now) { status = 'expired'; worstStatus = 'expired'; }
                else if (expiry && expiry <= thirtyDays) { status = 'expiring'; if (worstStatus !== 'expired') worstStatus = 'expiring'; }
                certSummary += '<span class="status-badge ' + status + '" style="margin:2px;">' + escapeHtml(cert.courseName || 'Cert') + '</span> ';
            });

            if (certs.length === 0) worstStatus = 'none';

            var statusBadge = '';
            if (worstStatus === 'expired') statusBadge = '<span class="status-badge expired">Action Required</span>';
            else if (worstStatus === 'expiring') statusBadge = '<span class="status-badge expiring">Expiring Soon</span>';
            else if (worstStatus === 'valid') statusBadge = '<span class="status-badge valid">Compliant</span>';
            else statusBadge = '<span class="status-badge pending">No Certs</span>';

            html += '<tr>';
            html += '<td class="name-cell">' + escapeHtml(emp.name) + '<br><span style="font-size:0.75rem;color:var(--gray-500);font-weight:400;">' + escapeHtml(emp.email || '') + '</span></td>';
            html += '<td>' + escapeHtml(emp.role || '-') + '</td>';
            html += '<td>' + certSummary + '</td>';
            html += '<td>' + statusBadge + '</td>';
            html += '<td><button class="portal-btn portal-btn-sm" onclick="Portal.viewEmployee(\'' + escapeAttr(emp.id) + '\')">View</button> <button class="portal-btn portal-btn-sm portal-btn-danger" onclick="Portal.deleteEmployee(\'' + escapeAttr(emp.id) + '\')">Delete</button></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    function showAddEmployeeModal() {
        showModal('Add Employee', '<div class="portal-form-group"><label class="portal-form-label">Full Name</label><input type="text" class="portal-form-input" id="empName" required placeholder="John Smith"></div><div class="portal-form-row"><div class="portal-form-group"><label class="portal-form-label">Email</label><input type="email" class="portal-form-input" id="empEmail" placeholder="john@company.com"></div><div class="portal-form-group"><label class="portal-form-label">Role / Position</label><input type="text" class="portal-form-input" id="empRole" placeholder="e.g. Site Manager"></div></div>', function() {
            var name = document.getElementById('empName').value.trim();
            var email = document.getElementById('empEmail').value.trim();
            var role = document.getElementById('empRole').value.trim();

            if (!name) {
                showToast('Please enter employee name.', 'error');
                return;
            }

            var uid = currentUser.uid;
            db.collection('partners').doc(uid).collection('employees').add({
                name: name,
                email: email,
                role: role,
                certifications: [],
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                hideModal();
                showToast('Employee added successfully');
                loadEmployees();
            }).catch(function(err) {
                showToast('Failed to add employee.', 'error');
                console.error(err);
            });
        });
    }

    function viewEmployee(empId) {
        var emp = employees.find(function(e) { return e.id === empId; });
        if (!emp) return;

        var certs = emp.certifications || [];
        var now = new Date();
        var thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        var certsHtml = '';
        if (certs.length > 0) {
            certsHtml = '<div class="portal-certs-list">';
            certs.forEach(function(cert, i) {
                var expiry = cert.expiryDate ? new Date(cert.expiryDate) : null;
                var status = 'valid';
                if (expiry && expiry < now) status = 'expired';
                else if (expiry && expiry <= thirtyDays) status = 'expiring';

                certsHtml += '<div class="portal-cert-item">';
                certsHtml += '<span class="cert-name">' + escapeHtml(cert.courseName || 'Certification') + '</span>';
                certsHtml += '<span class="status-badge ' + status + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span>';
                certsHtml += '<span class="cert-date">' + (cert.expiryDate ? 'Exp: ' + cert.expiryDate : 'No expiry') + '</span>';
                certsHtml += '<button class="portal-btn portal-btn-sm portal-btn-danger" onclick="Portal.removeCert(\'' + escapeAttr(empId) + '\',' + i + ')" style="margin-left:4px;">Remove</button>';
                certsHtml += '</div>';
            });
            certsHtml += '</div>';
        } else {
            certsHtml = '<p style="color:var(--gray-500);font-size:0.875rem;">No certifications recorded.</p>';
        }

        var html = '<div class="portal-form-group"><label class="portal-form-label">Name</label><input type="text" class="portal-form-input" id="viewEmpName" value="' + escapeAttr(emp.name) + '"></div>';
        html += '<div class="portal-form-row"><div class="portal-form-group"><label class="portal-form-label">Email</label><input type="email" class="portal-form-input" id="viewEmpEmail" value="' + escapeAttr(emp.email || '') + '"></div><div class="portal-form-group"><label class="portal-form-label">Role</label><input type="text" class="portal-form-input" id="viewEmpRole" value="' + escapeAttr(emp.role || '') + '"></div></div>';
        html += '<div style="margin-top:var(--space-5);"><label class="portal-form-label">Certifications</label>' + certsHtml + '</div>';
        html += '<div style="margin-top:var(--space-4);"><button class="portal-cert-add-btn" onclick="Portal.showAddCertForm(\'' + escapeAttr(empId) + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Certification</button></div>';

        // Inline cert form (hidden by default)
        html += '<div id="addCertFormInline" style="display:none;margin-top:var(--space-3);padding:var(--space-4);background:var(--gray-50);border-radius:10px;">';
        html += '<div class="portal-form-group"><label class="portal-form-label">Course Name</label><select class="portal-form-select" id="certCourseName"><option value="CPR Course (HLTAID009)">CPR Course (HLTAID009)</option><option value="Provide First Aid (HLTAID011)">Provide First Aid (HLTAID011)</option><option value="Childcare First Aid (HLTAID012)">Childcare First Aid (HLTAID012)</option><option value="Advanced Resuscitation (HLTAID015)">Advanced Resuscitation (HLTAID015)</option></select></div>';
        html += '<div class="portal-form-row"><div class="portal-form-group"><label class="portal-form-label">Date Completed</label><input type="date" class="portal-form-input" id="certDateCompleted"></div><div class="portal-form-group"><label class="portal-form-label">Expiry Date</label><input type="date" class="portal-form-input" id="certExpiryDate"></div></div>';
        html += '<button class="portal-btn portal-btn-primary portal-btn-sm" onclick="Portal.saveCert(\'' + escapeAttr(empId) + '\')">Add</button>';
        html += '</div>';

        showModal('Employee: ' + emp.name, html, function() {
            // Save employee detail edits
            var name = document.getElementById('viewEmpName').value.trim();
            var email = document.getElementById('viewEmpEmail').value.trim();
            var role = document.getElementById('viewEmpRole').value.trim();

            if (!name) {
                showToast('Name is required.', 'error');
                return;
            }

            var uid = currentUser.uid;
            db.collection('partners').doc(uid).collection('employees').doc(empId).update({
                name: name,
                email: email,
                role: role
            }).then(function() {
                hideModal();
                showToast('Employee updated');
                loadEmployees();
            }).catch(function(err) {
                showToast('Failed to update.', 'error');
            });
        });
    }

    function showAddCertForm(empId) {
        var form = document.getElementById('addCertFormInline');
        if (form) form.style.display = 'block';
    }

    function saveCert(empId) {
        var courseName = document.getElementById('certCourseName').value;
        var dateCompleted = document.getElementById('certDateCompleted').value;
        var expiryDate = document.getElementById('certExpiryDate').value;

        if (!courseName || !dateCompleted || !expiryDate) {
            showToast('Please fill all certification fields.', 'error');
            return;
        }

        var emp = employees.find(function(e) { return e.id === empId; });
        if (!emp) return;

        var certs = emp.certifications || [];
        certs.push({
            courseName: courseName,
            dateCompleted: dateCompleted,
            expiryDate: expiryDate
        });

        var uid = currentUser.uid;
        db.collection('partners').doc(uid).collection('employees').doc(empId).update({
            certifications: certs
        }).then(function() {
            hideModal();
            showToast('Certification added');
            loadEmployees();
        }).catch(function(err) {
            showToast('Failed to save certification.', 'error');
        });
    }

    function removeCert(empId, certIndex) {
        var emp = employees.find(function(e) { return e.id === empId; });
        if (!emp) return;

        var certs = emp.certifications || [];
        certs.splice(certIndex, 1);

        var uid = currentUser.uid;
        db.collection('partners').doc(uid).collection('employees').doc(empId).update({
            certifications: certs
        }).then(function() {
            hideModal();
            showToast('Certification removed');
            loadEmployees();
        }).catch(function(err) {
            showToast('Failed to remove certification.', 'error');
        });
    }

    function deleteEmployee(empId) {
        if (!confirm('Delete this employee? This cannot be undone.')) return;

        var uid = currentUser.uid;
        db.collection('partners').doc(uid).collection('employees').doc(empId).delete()
            .then(function() {
                showToast('Employee deleted');
                loadEmployees();
            })
            .catch(function(err) {
                showToast('Failed to delete employee.', 'error');
            });
    }

    function exportCSV() {
        if (employees.length === 0) {
            showToast('No employees to export.', 'warning');
            return;
        }

        var now = new Date();
        var rows = [['Name', 'Email', 'Role', 'Certification', 'Date Completed', 'Expiry Date', 'Status']];

        employees.forEach(function(emp) {
            var certs = emp.certifications || [];
            if (certs.length === 0) {
                rows.push([emp.name, emp.email || '', emp.role || '', 'None', '', '', 'No Certifications']);
            } else {
                certs.forEach(function(cert) {
                    var expiry = cert.expiryDate ? new Date(cert.expiryDate) : null;
                    var status = 'Valid';
                    if (expiry && expiry < now) status = 'Expired';
                    else if (expiry && expiry <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) status = 'Expiring Soon';
                    rows.push([emp.name, emp.email || '', emp.role || '', cert.courseName || '', cert.dateCompleted || '', cert.expiryDate || '', status]);
                });
            }
        });

        var csv = rows.map(function(row) {
            return row.map(function(cell) {
                return '"' + String(cell).replace(/"/g, '""') + '"';
            }).join(',');
        }).join('\n');

        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'employee-compliance-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exported');
    }

    // =====================================================
    // Booking Flow
    // =====================================================

    function loadCoursePricing() {
        db.collection('coursePricing').where('active', '==', true).get()
            .then(function(snapshot) {
                coursePricing = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    coursePricing.push(data);
                });
                if (coursePricing.length === 0) {
                    coursePricing = defaultCourses;
                }
            })
            .catch(function() {
                coursePricing = defaultCourses;
            });
    }

    function loadBookings() {
        var uid = currentUser.uid;
        db.collection('partners').doc(uid).collection('bookings')
            .orderBy('createdAt', 'desc')
            .get()
            .then(function(snapshot) {
                bookings = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    bookings.push(data);
                });
                if (currentSection === 'bookings') renderBookings();
                if (currentSection === 'dashboard') renderDashboardBookings();
            })
            .catch(function(err) {
                console.error('Failed to load bookings:', err);
            });
    }

    function initBookingFlow() {
        bookingState = { course: null, selectedEmployees: [], date: '', location: '' };
        showBookingStep(1);
        renderCourseGrid();
    }

    function renderCourseGrid() {
        var container = document.getElementById('courseGrid');
        var discount = (partnerData && partnerData.status === 'approved') ? (partnerData.discountPercent || 0) : 0;

        var html = '';
        coursePricing.forEach(function(course) {
            var discountedPrice = discount > 0 ? Math.round(course.basePrice * (1 - discount / 100)) : course.basePrice;

            html += '<div class="portal-course-card" data-course-id="' + escapeAttr(course.id) + '" onclick="Portal.selectCourse(\'' + escapeAttr(course.id) + '\')">';
            html += '<h4>' + escapeHtml(course.name) + '</h4>';
            html += '<p class="code">' + escapeHtml(course.code) + '</p>';
            html += '<div class="portal-course-price">';
            if (discount > 0) {
                html += '<span class="original">$' + course.basePrice + '</span>';
                html += '<span class="discounted">$' + discountedPrice + '</span>';
                html += '<span class="discount-tag">-' + discount + '%</span>';
            } else {
                html += '<span class="discounted">$' + course.basePrice + '</span>';
                if (partnerData && partnerData.status === 'pending') {
                    html += '<span class="discount-tag" style="background:#fef3c7;color:#92400e;">Discount after approval</span>';
                }
            }
            html += '</div></div>';
        });

        container.innerHTML = html;
    }

    function selectCourse(courseId) {
        var course = coursePricing.find(function(c) { return c.id === courseId; });
        if (!course) return;
        bookingState.course = course;

        // Highlight selected
        document.querySelectorAll('.portal-course-card').forEach(function(card) {
            card.classList.toggle('selected', card.dataset.courseId === courseId);
        });

        // Show step 2
        setTimeout(function() { showBookingStep(2); renderBookEmployeeList(); }, 200);
    }

    function renderBookEmployeeList() {
        var container = document.getElementById('bookEmployeeList');

        if (employees.length === 0) {
            container.innerHTML = '<div class="portal-empty"><p>No employees added yet. <a href="#" onclick="Portal.switchSection(\'employees\');return false;" style="color:var(--red);font-weight:600;">Add employees first.</a></p></div>';
            return;
        }

        var html = '';
        employees.forEach(function(emp) {
            var checked = bookingState.selectedEmployees.indexOf(emp.id) !== -1 ? 'checked' : '';
            html += '<label style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-bottom:1px solid var(--gray-100);cursor:pointer;">';
            html += '<input type="checkbox" value="' + escapeAttr(emp.id) + '" ' + checked + ' onchange="Portal.toggleBookEmployee(\'' + escapeAttr(emp.id) + '\')" style="width:18px;height:18px;accent-color:var(--red);">';
            html += '<span style="font-weight:600;color:var(--navy);">' + escapeHtml(emp.name) + '</span>';
            html += '<span style="color:var(--gray-500);font-size:0.8125rem;">' + escapeHtml(emp.role || '') + '</span>';
            html += '</label>';
        });

        container.innerHTML = html;
    }

    function toggleBookEmployee(empId) {
        var idx = bookingState.selectedEmployees.indexOf(empId);
        if (idx === -1) bookingState.selectedEmployees.push(empId);
        else bookingState.selectedEmployees.splice(idx, 1);
    }

    function showBookingStep(step) {
        for (var i = 1; i <= 4; i++) {
            document.getElementById('bookStep' + i).style.display = i === step ? 'block' : 'none';
        }
    }

    function bookingBack(step) {
        showBookingStep(step);
    }

    function bookStep2Next() {
        if (bookingState.selectedEmployees.length === 0) {
            showToast('Please select at least one employee.', 'warning');
            return;
        }
        showBookingStep(3);
    }

    function bookStep3Next() {
        var date = document.getElementById('bookDate').value;
        var location = document.getElementById('bookLocation').value;

        if (!date || !location) {
            showToast('Please select a date and location.', 'warning');
            return;
        }

        bookingState.date = date;
        bookingState.location = location;
        renderBookingReview();
        showBookingStep(4);
    }

    function renderBookingReview() {
        var container = document.getElementById('bookingReviewContent');
        var course = bookingState.course;
        var discount = (partnerData && partnerData.status === 'approved') ? (partnerData.discountPercent || 0) : 0;
        var pricePerPerson = discount > 0 ? Math.round(course.basePrice * (1 - discount / 100)) : course.basePrice;
        var numEmployees = bookingState.selectedEmployees.length;
        var total = pricePerPerson * numEmployees;

        var empNames = bookingState.selectedEmployees.map(function(id) {
            var emp = employees.find(function(e) { return e.id === id; });
            return emp ? emp.name : 'Unknown';
        });

        var html = '<div class="portal-booking-review">';
        html += '<div class="portal-booking-review-row"><span class="label">Course</span><span>' + escapeHtml(course.name) + ' (' + escapeHtml(course.code) + ')</span></div>';
        html += '<div class="portal-booking-review-row"><span class="label">Date</span><span>' + bookingState.date + '</span></div>';
        html += '<div class="portal-booking-review-row"><span class="label">Location</span><span>' + escapeHtml(bookingState.location) + '</span></div>';
        html += '<div class="portal-booking-review-row"><span class="label">Employees (' + numEmployees + ')</span><span>' + escapeHtml(empNames.join(', ')) + '</span></div>';
        html += '<div class="portal-booking-review-row"><span class="label">Price per person</span><span>$' + pricePerPerson + (discount > 0 ? ' <span style="color:var(--green);font-size:0.75rem;">(-' + discount + '% partner)</span>' : '') + '</span></div>';
        html += '<div class="portal-booking-review-row"><span class="label">Total</span><span>$' + total + '</span></div>';
        html += '</div>';

        container.innerHTML = html;
    }

    function submitBooking() {
        var btn = document.getElementById('submitBookingBtn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        var course = bookingState.course;
        var discount = (partnerData && partnerData.status === 'approved') ? (partnerData.discountPercent || 0) : 0;
        var pricePerPerson = discount > 0 ? Math.round(course.basePrice * (1 - discount / 100)) : course.basePrice;
        var numEmployees = bookingState.selectedEmployees.length;

        var empDetails = bookingState.selectedEmployees.map(function(id) {
            var emp = employees.find(function(e) { return e.id === id; });
            return emp ? { name: emp.name, email: emp.email || '' } : { name: 'Unknown', email: '' };
        });

        var bookingDoc = {
            courseName: course.name,
            courseCode: course.code,
            courseDate: bookingState.date,
            location: bookingState.location,
            employees: empDetails,
            totalPrice: pricePerPerson * numEmployees,
            discountApplied: discount,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        var uid = currentUser.uid;
        db.collection('partners').doc(uid).collection('bookings').add(bookingDoc)
            .then(function() {
                showToast('Booking submitted! We\'ll confirm shortly.');
                sendBookingEmail(bookingDoc, empDetails);
                loadBookings();
                initBookingFlow();
                switchSection('bookings');
            })
            .catch(function(err) {
                console.error('Booking error:', err);
                showToast('Failed to submit booking. Please try again.', 'error');
                btn.disabled = false;
                btn.textContent = 'Submit Booking Request';
            });
    }

    function sendBookingEmail(booking, empDetails) {
        var subject = encodeURIComponent('Partner Booking Request: ' + booking.courseName);
        var empList = empDetails.map(function(e) { return e.name + (e.email ? ' (' + e.email + ')' : ''); }).join('\n  - ');
        var body = encodeURIComponent(
            'PARTNER BOOKING REQUEST\n\n' +
            'Business: ' + (partnerData.businessName || '') + '\n' +
            'Contact: ' + (partnerData.contactName || '') + '\n' +
            'Email: ' + (partnerData.email || '') + '\n' +
            'Phone: ' + (partnerData.phone || '') + '\n\n' +
            'Course: ' + booking.courseName + ' (' + booking.courseCode + ')\n' +
            'Preferred Date: ' + booking.courseDate + '\n' +
            'Location: ' + booking.location + '\n' +
            'Discount: ' + booking.discountApplied + '%\n' +
            'Total: $' + booking.totalPrice + '\n\n' +
            'Employees:\n  - ' + empList + '\n'
        );

        // Open mailto in background
        var link = document.createElement('a');
        link.href = 'mailto:admin@coralseatraining.com.au?subject=' + subject + '&body=' + body;
        link.click();
    }

    // =====================================================
    // Bookings History
    // =====================================================

    function renderBookings() {
        var container = document.getElementById('bookingsTableContainer');

        if (bookings.length === 0) {
            container.innerHTML = '<div class="portal-empty" style="padding:var(--space-8);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>No Bookings Yet</h3><p>Your booking history will appear here.</p></div>';
            return;
        }

        var html = '<div class="portal-table-wrapper"><table class="portal-table">';
        html += '<thead><tr><th>Course</th><th>Date</th><th>Location</th><th>Employees</th><th>Total</th><th>Status</th></tr></thead>';
        html += '<tbody>';

        bookings.forEach(function(b) {
            var statusClass = b.status || 'pending';
            html += '<tr>';
            html += '<td class="name-cell">' + escapeHtml(b.courseName || '') + '</td>';
            html += '<td>' + (b.courseDate || 'TBD') + '</td>';
            html += '<td>' + escapeHtml(b.location || '') + '</td>';
            html += '<td>' + (b.employees ? b.employees.length : 0) + '</td>';
            html += '<td>$' + (b.totalPrice || 0) + '</td>';
            html += '<td><span class="status-badge ' + statusClass + '">' + statusClass.charAt(0).toUpperCase() + statusClass.slice(1) + '</span></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // =====================================================
    // Profile
    // =====================================================

    function saveProfile(e) {
        e.preventDefault();

        var uid = currentUser.uid;
        var updates = {
            businessName: document.getElementById('profileBusiness').value.trim(),
            contactName: document.getElementById('profileName').value.trim(),
            abn: document.getElementById('profileABN').value.trim(),
            phone: document.getElementById('profilePhone').value.trim()
        };

        db.collection('partners').doc(uid).update(updates)
            .then(function() {
                partnerData = Object.assign(partnerData, updates);
                updateUI();
                showToast('Profile saved');
            })
            .catch(function(err) {
                showToast('Failed to save profile.', 'error');
            });
    }

    // =====================================================
    // Modal
    // =====================================================

    function showModal(title, bodyHtml, onSave) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHtml;
        document.getElementById('portalModal').classList.add('active');
        modalSaveCallback = onSave || null;

        // Hide save button if no callback
        document.getElementById('modalSave').style.display = onSave ? '' : 'none';
    }

    function hideModal() {
        document.getElementById('portalModal').classList.remove('active');
        modalSaveCallback = null;
    }

    // =====================================================
    // Toast
    // =====================================================

    function showToast(message, type) {
        type = type || 'success';
        var container = document.getElementById('toastContainer');
        var toast = document.createElement('div');
        toast.className = 'portal-toast ' + type;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    // =====================================================
    // Mobile Sidebar
    // =====================================================

    function toggleMobileSidebar() {
        document.getElementById('portalSidebar').classList.toggle('open');
        document.getElementById('portalOverlay').classList.toggle('active');
    }

    function closeMobileSidebar() {
        document.getElementById('portalSidebar').classList.remove('open');
        document.getElementById('portalOverlay').classList.remove('active');
    }

    // =====================================================
    // Event Listeners
    // =====================================================

    function initEventListeners() {
        // Nav items
        document.querySelectorAll('.portal-nav-item').forEach(function(item) {
            item.addEventListener('click', function() {
                switchSection(item.dataset.section);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', function() {
            auth.signOut().then(function() {
                window.location.href = 'index.html';
            });
        });

        // Mobile toggle
        document.getElementById('mobileNavToggle').addEventListener('click', toggleMobileSidebar);
        document.getElementById('portalOverlay').addEventListener('click', closeMobileSidebar);

        // Add Employee buttons
        document.getElementById('addEmployeeBtn').addEventListener('click', showAddEmployeeModal);
        var addFirst = document.getElementById('addFirstEmployeeBtn');
        if (addFirst) addFirst.addEventListener('click', showAddEmployeeModal);

        // Employee search
        document.getElementById('employeeSearch').addEventListener('input', function() {
            renderEmployees(this.value);
        });

        // CSV export
        document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

        // Modal
        document.getElementById('modalClose').addEventListener('click', hideModal);
        document.getElementById('modalCancel').addEventListener('click', hideModal);
        document.getElementById('modalSave').addEventListener('click', function() {
            if (modalSaveCallback) modalSaveCallback();
        });

        // Click backdrop to close modal
        document.getElementById('portalModal').addEventListener('click', function(e) {
            if (e.target === this) hideModal();
        });

        // Profile form
        document.getElementById('profileForm').addEventListener('submit', saveProfile);

        // Booking flow next buttons
        document.getElementById('bookStep2Next').addEventListener('click', bookStep2Next);
        document.getElementById('bookStep3Next').addEventListener('click', bookStep3Next);
        document.getElementById('submitBookingBtn').addEventListener('click', submitBooking);
    }

    // =====================================================
    // Helpers
    // =====================================================

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatDate(date) {
        if (!date) return '';
        var d = new Date(date);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    // =====================================================
    // Public API
    // =====================================================

    return {
        init: init,
        switchSection: switchSection,
        viewEmployee: viewEmployee,
        deleteEmployee: deleteEmployee,
        showAddCertForm: showAddCertForm,
        saveCert: saveCert,
        removeCert: removeCert,
        selectCourse: selectCourse,
        toggleBookEmployee: toggleBookEmployee,
        bookingBack: bookingBack
    };

})();

// Start
Portal.init();
