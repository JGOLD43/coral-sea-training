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
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            try {
                // Simulate form submission
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Create mailto link as fallback
                const mailtoSubject = encodeURIComponent(`Course Enquiry: ${data.course || 'General'}`);
                const mailtoBody = encodeURIComponent(
                    `Name: ${data.name}\n` +
                    `Email: ${data.email}\n` +
                    `Phone: ${data.phone || 'Not provided'}\n` +
                    `Course Interest: ${data.course || 'Not specified'}\n\n` +
                    `Message:\n${data.message}`
                );

                // Show success message
                const formWrapper = document.getElementById('contactFormWrapper');
                if (formWrapper) {
                    formWrapper.innerHTML = `
                        <div style="text-align: center; padding: var(--space-8);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; color: var(--red); margin: 0 auto var(--space-6);">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            <h3 style="font-size: 1.5rem; margin-bottom: var(--space-4);">Thank You!</h3>
                            <p style="color: var(--gray-600); margin-bottom: var(--space-6);">Your message has been received. We'll get back to you shortly.</p>
                            <p style="font-size: 0.875rem; color: var(--gray-500);">
                                Or email us directly at:<br>
                                <a href="mailto:admin@coralseatraining.com.au?subject=${mailtoSubject}&body=${mailtoBody}" style="color: var(--red); font-weight: 600;">
                                    admin@coralseatraining.com.au
                                </a>
                            </p>
                        </div>
                    `;
                }

            } catch (error) {
                console.error('Form submission error:', error);
                submitBtn.textContent = 'Error - Try Again';
                submitBtn.disabled = false;

                setTimeout(() => {
                    submitBtn.textContent = originalText;
                }, 3000);
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

})();
