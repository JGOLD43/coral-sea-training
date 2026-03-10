(function() {
    'use strict';

    var config = window.CST_PUBLIC_CONFIG || {};
    var analytics = config.analytics || {};
    var forms = config.forms || {};
    var fallback = config.fallbackContact || {};
    var measurementId = typeof analytics.measurementId === 'string' ? analytics.measurementId.trim() : '';
    var posthogKey = typeof analytics.posthogKey === 'string' ? analytics.posthogKey.trim() : '';
    var posthogHost = typeof analytics.posthogHost === 'string' ? analytics.posthogHost.trim().replace(/\/$/, '') : '';
    var ATTRIBUTION_STORAGE_KEY = 'cst_attribution_v1';
    var ANONYMOUS_ID_KEY = 'cst_anonymous_id';
    var SESSION_ID_KEY = 'cst_session_id';
    var PAGE_VIEW_SENT_KEY = 'cst_page_view_sent';
    var suppressEventBridge = false;
    var rawGtag = null;

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

    function safeStorageGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (err) {
            return '';
        }
    }

    function safeStorageSet(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (err) {}
    }

    function generateId(prefix) {
        return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function getAnonymousId() {
        var existing = safeStorageGet(ANONYMOUS_ID_KEY);
        if (existing) return existing;
        var created = generateId('anon');
        safeStorageSet(ANONYMOUS_ID_KEY, created);
        return created;
    }

    function getAnalyticsSessionId() {
        var existing = safeStorageGet(SESSION_ID_KEY);
        if (existing) return existing;
        var created = generateId('sess');
        safeStorageSet(SESSION_ID_KEY, created);
        return created;
    }

    function readAttribution() {
        var raw = safeStorageGet(ATTRIBUTION_STORAGE_KEY);
        if (!raw) return {};
        try {
            return JSON.parse(raw) || {};
        } catch (err) {
            return {};
        }
    }

    function writeAttribution(value) {
        safeStorageSet(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
    }

    function captureAttribution() {
        var url = new URL(window.location.href);
        var params = url.searchParams;
        var existing = readAttribution();
        var next = {
            landingPage: existing.landingPage || window.location.href,
            firstReferrer: existing.firstReferrer || document.referrer || '',
            lastReferrer: document.referrer || existing.lastReferrer || '',
            utmSource: params.get('utm_source') || existing.utmSource || '',
            utmMedium: params.get('utm_medium') || existing.utmMedium || '',
            utmCampaign: params.get('utm_campaign') || existing.utmCampaign || '',
            utmTerm: params.get('utm_term') || existing.utmTerm || '',
            utmContent: params.get('utm_content') || existing.utmContent || '',
            gclid: params.get('gclid') || existing.gclid || '',
            fbclid: params.get('fbclid') || existing.fbclid || '',
            firstSeenAt: existing.firstSeenAt || new Date().toISOString(),
            lastSeenAt: new Date().toISOString()
        };
        writeAttribution(next);
        return next;
    }

    function getAttributionPayload() {
        var attribution = readAttribution();
        return {
            anonymousId: getAnonymousId(),
            analyticsSessionId: getAnalyticsSessionId(),
            landingPage: attribution.landingPage || window.location.href,
            referrer: attribution.lastReferrer || document.referrer || '',
            utmSource: attribution.utmSource || '',
            utmMedium: attribution.utmMedium || '',
            utmCampaign: attribution.utmCampaign || '',
            utmTerm: attribution.utmTerm || '',
            utmContent: attribution.utmContent || '',
            gclid: attribution.gclid || '',
            fbclid: attribution.fbclid || ''
        };
    }

    function buildEventPayload(name, params) {
        var attribution = getAttributionPayload();
        var payload = Object.assign({}, params || {});
        return {
            eventId: payload.event_id || generateId('evt'),
            eventName: name,
            source: payload.source || 'website',
            occurredAt: new Date().toISOString(),
            anonymousId: attribution.anonymousId,
            analyticsSessionId: attribution.analyticsSessionId,
            pageUrl: window.location.href,
            pagePath: window.location.pathname,
            pageTitle: document.title || '',
            referrer: attribution.referrer,
            landingPage: attribution.landingPage,
            utmSource: attribution.utmSource,
            utmMedium: attribution.utmMedium,
            utmCampaign: attribution.utmCampaign,
            utmTerm: attribution.utmTerm,
            utmContent: attribution.utmContent,
            gclid: attribution.gclid,
            fbclid: attribution.fbclid,
            courseCode: payload.course || payload.course_code || payload.courseCode || '',
            locationLabel: payload.location || payload.locationLabel || '',
            nativeSessionRef: payload.session_id || payload.nativeSessionRef || '',
            partySize: typeof payload.party_size === 'number'
                ? payload.party_size
                : typeof payload.partySize === 'number'
                    ? payload.partySize
                    : null,
            publicBookingId: payload.publicBookingId || '',
            bookingId: payload.bookingId || '',
            payload: payload
        };
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
                form.addEventListener('submit', function() {
                    track('form_submit', { form_key: key, source: 'website_form' });
                });
                return;
            }

            form.addEventListener('submit', function(event) {
                event.preventDefault();
                track('form_submit_blocked', { form_key: key, source: 'website_form' });
                var fallbackMessage = getFallbackContactMessage();
                var message = fallbackMessage ?
                    'This form is not configured yet. Please ' + fallbackMessage + '.' :
                    'This form is not configured yet.';
                showFormMessage(form, message);
            });
        });
    }

    function getCheckoutEndpoint() {
        if (isConfiguredUrl(config.checkoutEndpoint)) {
            return config.checkoutEndpoint;
        }

        var publicApiBase = getPublicApiBaseUrl();
        return publicApiBase ? publicApiBase + '/createCheckoutSession' : '';
    }

    function getConfiguredProjectId() {
        var firebaseConfig = window.firebaseConfig || {};
        var projectId = typeof firebaseConfig.projectId === 'string' ? firebaseConfig.projectId.trim() : '';
        if (!projectId || projectId.indexOf('YOUR_') !== -1) {
            return '';
        }
        return projectId;
    }

    function getPublicApiBaseUrl() {
        if (isConfiguredUrl(config.publicApiBaseUrl)) {
            return config.publicApiBaseUrl.replace(/\/$/, '');
        }
        if (isConfiguredUrl(config.adminFunctionsBaseUrl)) {
            return config.adminFunctionsBaseUrl.replace(/\/$/, '');
        }
        if (isConfiguredUrl(config.checkoutEndpoint)) {
            return config.checkoutEndpoint.replace(/\/[^/]+$/, '');
        }
        var projectId = getConfiguredProjectId();
        if (projectId) {
            return 'https://us-central1-' + projectId + '.cloudfunctions.net';
        }
        return '';
    }

    function getPublicApiEndpoint(name) {
        var base = getPublicApiBaseUrl();
        return base ? base + '/' + name.replace(/^\//, '') : '';
    }

    function getMetricsEndpoint() {
        if (isConfiguredUrl(config.metricsEndpoint)) {
            return config.metricsEndpoint;
        }
        if (isConfiguredUrl(config.publicApiBaseUrl)) {
            return config.publicApiBaseUrl.replace(/\/api\/public-bookings\/?$/, '') + '/api/metrics/ingest';
        }
        return '';
    }

    function sendEventToMetrics(name, params) {
        var endpoint = getMetricsEndpoint();
        if (!endpoint) return;

        var batch = { events: [buildEventPayload(name, params)] };
        try {
            if (navigator.sendBeacon) {
                var body = new Blob([JSON.stringify(batch)], { type: 'application/json' });
                navigator.sendBeacon(endpoint, body);
                return;
            }
        } catch (err) {}

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
            keepalive: true
        }).catch(function() {});
    }

    function sendEventToPostHog(name, params) {
        if (!posthogKey || !isConfiguredUrl(posthogHost)) return;
        fetch(posthogHost + '/capture/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: posthogKey,
                event: name,
                distinct_id: getAnonymousId(),
                properties: Object.assign({
                    $current_url: window.location.href,
                    $pathname: window.location.pathname
                }, getAttributionPayload(), params || {})
            }),
            keepalive: true
        }).catch(function() {});
    }

    function bridgeEvent(name, params) {
        sendEventToMetrics(name, params);
        sendEventToPostHog(name, params);
    }

    function patchGtag() {
        rawGtag = typeof window.gtag === 'function' ? window.gtag : null;
        if (!rawGtag) return;

        window.gtag = function() {
            var args = Array.prototype.slice.call(arguments);
            rawGtag.apply(window, args);
            if (!suppressEventBridge && args[0] === 'event' && typeof args[1] === 'string') {
                bridgeEvent(args[1], args[2] || {});
            }
        };
    }

    function track(name, params) {
        if (typeof window.gtag === 'function') {
            suppressEventBridge = true;
            window.gtag('event', name, params || {});
            suppressEventBridge = false;
        }
        bridgeEvent(name, params || {});
    }

    function trackPageViewOnce() {
        if (safeStorageGet(PAGE_VIEW_SENT_KEY) === window.location.href) return;
        safeStorageSet(PAGE_VIEW_SENT_KEY, window.location.href);
        sendEventToMetrics('page_view', { source: 'website_page' });
        sendEventToPostHog('page_view', { source: 'website_page' });
    }

    ensureDataLayer();
    captureAttribution();
    initAnalytics();
    patchGtag();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            bindForms();
            trackPageViewOnce();
        }, { once: true });
    } else {
        bindForms();
        trackPageViewOnce();
    }

    window.CST = Object.assign({}, window.CST || {}, {
        config: config,
        getFormEndpoint: getFormEndpoint,
        getCheckoutEndpoint: getCheckoutEndpoint,
        getPublicApiBaseUrl: getPublicApiBaseUrl,
        getPublicApiEndpoint: getPublicApiEndpoint,
        getMetricsEndpoint: getMetricsEndpoint,
        getAnonymousId: getAnonymousId,
        getAnalyticsSessionId: getAnalyticsSessionId,
        getAttributionPayload: getAttributionPayload,
        getFallbackContactMessage: getFallbackContactMessage,
        showFormMessage: showFormMessage,
        track: track
    });
})();
