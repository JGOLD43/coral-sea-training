/**
 * Coral Sea Training - Main JavaScript
 * Conversion-optimized interactions
 */

(function() {
    'use strict';

    // =====================================================
    // Mobile Menu Toggle
    // =====================================================

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('nav');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('mobile-open');
        });

        // Close menu when clicking a link
        nav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                nav.classList.remove('mobile-open');
            });
        });
    }

    // =====================================================
    // Header Scroll Effect
    // =====================================================

    const header = document.getElementById('header');

    if (header) {
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        }, { passive: true });
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

            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            // Collect form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            // For static hosting, we'll use a mailto fallback or external service
            // In production, you'd send this to your backend or a service like Formspree

            try {
                // Simulate form submission delay
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
                const formWrapper = this.parentElement;
                formWrapper.innerHTML = `
                    <div class="form-success">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <h3>Thank You!</h3>
                        <p>Your message has been received. We'll get back to you shortly.</p>
                        <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--gray-500);">
                            Or email us directly at:<br>
                            <a href="mailto:admin@coralseatraining.com.au?subject=${mailtoSubject}&body=${mailtoBody}" style="color: var(--primary);">
                                admin@coralseatraining.com.au
                            </a>
                        </p>
                    </div>
                `;

                // Track conversion (for analytics)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'form_submission', {
                        'event_category': 'Contact',
                        'event_label': data.course || 'General'
                    });
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
    // Intersection Observer for Animations
    // =====================================================

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.course-card, .testimonial-card, .location-card, .stat-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // Add CSS for animated elements
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // =====================================================
    // Phone Number Click Tracking
    // =====================================================

    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        link.addEventListener('click', function() {
            const phoneNumber = this.getAttribute('href').replace('tel:', '');

            // Track phone clicks for analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'phone_click', {
                    'event_category': 'Contact',
                    'event_label': phoneNumber
                });
            }

            console.log('Phone click tracked:', phoneNumber);
        });
    });

    // =====================================================
    // Course Card CTA Tracking
    // =====================================================

    document.querySelectorAll('.course-card .btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const courseCard = this.closest('.course-card');
            const courseTitle = courseCard.querySelector('.course-title').textContent;

            // Track course interest for analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'course_interest', {
                    'event_category': 'Courses',
                    'event_label': courseTitle
                });
            }

            console.log('Course interest tracked:', courseTitle);
        });
    });

    // =====================================================
    // Lazy Load Images (if any are added later)
    // =====================================================

    if ('loading' in HTMLImageElement.prototype) {
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            img.src = img.dataset.src;
        });
    } else {
        // Fallback for browsers that don't support lazy loading
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');

        if (lazyImages.length > 0) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        imageObserver.unobserve(img);
                    }
                });
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }

    // =====================================================
    // Scroll Progress Indicator (optional enhancement)
    // =====================================================

    // Uncomment if you want a reading progress bar
    /*
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--primary), var(--secondary));
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    }, { passive: true });
    */

})();
