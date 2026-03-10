(function() {
    'use strict';

    var config = window.CST_PUBLIC_CONFIG || {};
    var analytics = config.analytics || {};
    var forms = config.forms || {};
    var fallback = config.fallbackContact || {};
    var measurementId = typeof analytics.measurementId === 'string' ? analytics.measurementId.trim() : '';

    function isValidMeasurementId(value) {
        return /^G-[A-Z0-9]+$/i.test(value);
    }

    function isConfiguredUrl(value) {
        return typeof value === 'string' && /^https?:\/\//i.test(value) && value.indexOf('PLACEHOLDER') === -1;
    }

    function ensureDataLayer() {
        window.dataLayer = window.dataLayer || [];
        if (typeof window.gtag !== 'function') {
            window.gtag = function() {
                window.dataLayer.push(arguments);
            };
        }
    }

    function initAnalytics() {
        ensureDataLayer();
        if (!isValidMeasurementId(measurementId)) {
            return;
        }

        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
        document.head.appendChild(script);

        window.gtag('js', new Date());
        window.gtag('config', measurementId);
    }

    function getFormEndpoint(key) {
        var value = forms[key];
        return isConfiguredUrl(value) ? value : '';
    }

    function getFallbackContactMessage() {
        var parts = [];
        if (fallback.phoneDisplay || fallback.phone) {
            parts.push('call ' + (fallback.phoneDisplay || fallback.phone));
        }
        if (fallback.email) {
            parts.push('email ' + fallback.email);
        }
        return parts.join(' or ');
    }

    function showFormMessage(form, message) {
        var existing = form.querySelector('[data-config-message]');
        if (!existing) {
            existing = document.createElement('div');
            existing.setAttribute('data-config-message', 'true');
            existing.style.marginTop = '12px';
            existing.style.padding = '12px 14px';
            existing.style.border = '1px solid rgba(217,10,10,0.2)';
            existing.style.background = 'rgba(217,10,10,0.06)';
            existing.style.borderRadius = '10px';
            existing.style.color = '#8b1e1e';
            existing.style.fontSize = '0.875rem';
            existing.style.lineHeight = '1.5';
            form.appendChild(existing);
        }
        existing.textContent = message;
    }

    function bindForms() {
        document.querySelectorAll('form[data-form-key]').forEach(function(form) {
            var key = form.getAttribute('data-form-key');
            var endpoint = getFormEndpoint(key);
            if (endpoint) {
                form.setAttribute('action', endpoint);
                return;
            }

            form.addEventListener('submit', function(event) {
                event.preventDefault();
                var fallbackMessage = getFallbackContactMessage();
                var message = fallbackMessage ?
                    'This form is not configured yet. Please ' + fallbackMessage + '.' :
                    'This form is not configured yet.';
                showFormMessage(form, message);
            });
        });
    }

    function getCheckoutEndpoint() {
        return isConfiguredUrl(config.checkoutEndpoint) ? config.checkoutEndpoint : '';
    }

    ensureDataLayer();
    initAnalytics();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindForms, { once: true });
    } else {
        bindForms();
    }

    window.CST = Object.assign({}, window.CST || {}, {
        config: config,
        getFormEndpoint: getFormEndpoint,
        getCheckoutEndpoint: getCheckoutEndpoint,
        getFallbackContactMessage: getFallbackContactMessage,
        showFormMessage: showFormMessage,
        track: function(name, params) {
            if (typeof window.gtag === 'function') {
                window.gtag('event', name, params || {});
            }
        }
    });
})();
