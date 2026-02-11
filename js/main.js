/**
 * Coral Sea Training - Main JavaScript
 * Premium Website Interactions
 */

(function() {
    'use strict';

    // =====================================================
    // Header Scroll Effect
    // =====================================================

    const header = document.getElementById('header');

    if (header) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check
    }

    // =====================================================
    // Mobile Menu Toggle
    // =====================================================

    const mobileToggle = document.getElementById('mobileToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            mobileToggle.classList.toggle('active');
        });

        // Close menu when clicking links
        mobileMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                mobileToggle.classList.remove('active');
            });
        });
    }

    // =====================================================
    // Smooth Scroll for Anchor Links
    // =====================================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // =====================================================
    // Contact Form Handling
    // =====================================================

    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function() {
            // Fire GA4 event — form submits natively to Formspree
            if (typeof gtag !== 'undefined') {
                gtag('event', 'contact_form_submit', {
                    'event_category': 'Contact',
                    'event_label': this.querySelector('#course') ? this.querySelector('#course').value : 'general'
                });
            }
        });
    }

    // =====================================================
    // Scroll Animations
    // =====================================================

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                animationObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Elements to animate
    const animateElements = document.querySelectorAll('.course-card, .testimonial-card, .location-card, .value-card, .feature-item');

    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        animationObserver.observe(el);
    });

    // =====================================================
    // Phone Click Tracking
    // =====================================================

    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        link.addEventListener('click', function() {
            const phoneNumber = this.getAttribute('href').replace('tel:', '');

            // Google Analytics tracking (if available)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'phone_click', {
                    'event_category': 'Contact',
                    'event_label': phoneNumber
                });
            }
        });
    });

    // =====================================================
    // Course Button Tracking
    // =====================================================

    document.querySelectorAll('.course-card .btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const courseCard = this.closest('.course-card');
            if (courseCard) {
                const courseTitle = courseCard.querySelector('.course-title')?.textContent;

                if (typeof gtag !== 'undefined') {
                    gtag('event', 'course_click', {
                        'event_category': 'Courses',
                        'event_label': courseTitle
                    });
                }
            }
        });
    });

    // =====================================================
    // Primary CTA Click Tracking (sitewide)
    // =====================================================

    document.querySelectorAll('.btn-primary, .btn-white').forEach(btn => {
        btn.addEventListener('click', function() {
            if (typeof gtag !== 'undefined') {
                gtag('event', 'cta_primary_click', {
                    'event_label': this.textContent.trim().substring(0, 50),
                    'page_location': window.location.pathname
                });
            }
        });
    });

})();
